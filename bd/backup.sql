-- =====================================================================
-- G7 — Sistema de Controle de Frequência e Mensalidades de Academia
-- Script de inicialização (PostgreSQL 16+). Executar em banco limpo.
-- Usuários de login (app_user, leitor_user) são criados por
-- bd/init-usuarios.sh, pois as senhas vêm de variáveis de ambiente.
-- =====================================================================

-- 1. EXTENSÕES ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. SCHEMAS -----------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS financeiro;
CREATE SCHEMA IF NOT EXISTS audit;

-- 3. ROLES (grupos, sem login) -----------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rl_leitor') THEN
    CREATE ROLE rl_leitor NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rl_escritor') THEN
    CREATE ROLE rl_escritor NOLOGIN;
  END IF;
END $$;
GRANT rl_leitor TO rl_escritor;   -- escritor também lê

-- Nada é público: remove o acesso padrão
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON DATABASE g7_academia FROM PUBLIC;

-- 4. TABELAS -----------------------------------------------------------
CREATE TABLE app.operadores (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(120) NOT NULL,
  email       VARCHAR(160) NOT NULL UNIQUE,
  senha_hash  TEXT NOT NULL,                       -- BCrypt via pgcrypto (crypt + gen_salt('bf'))
  perfil      VARCHAR(10) NOT NULL CHECK (perfil IN ('ADMIN','OPERADOR')),
  ativo       BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.alunos (
  id               BIGSERIAL PRIMARY KEY,
  nome             VARCHAR(150) NOT NULL,
  cpf              CHAR(11) NOT NULL UNIQUE CHECK (cpf ~ '^[0-9]{11}$'),
  data_nascimento  DATE NOT NULL CHECK (data_nascimento < CURRENT_DATE),
  telefone         VARCHAR(20),
  email            VARCHAR(160),
  data_cadastro    DATE NOT NULL DEFAULT CURRENT_DATE,
  status           VARCHAR(10) NOT NULL DEFAULT 'ATIVO'
                   CHECK (status IN ('ATIVO','INATIVO','BLOQUEADO'))
);
CREATE INDEX idx_alunos_status ON app.alunos (status);
CREATE INDEX idx_alunos_nome   ON app.alunos (lower(nome));

CREATE TABLE app.planos (
  id             BIGSERIAL PRIMARY KEY,
  nome           VARCHAR(60) NOT NULL UNIQUE,
  descricao      VARCHAR(255),
  valor_mensal   NUMERIC(10,2) NOT NULL CHECK (valor_mensal > 0),
  duracao_meses  INTEGER NOT NULL CHECK (duracao_meses > 0),
  ativo          BOOLEAN NOT NULL DEFAULT TRUE,
  data_cadastro  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE app.matriculas (
  id               BIGSERIAL PRIMARY KEY,
  aluno_id         BIGINT NOT NULL REFERENCES app.alunos(id),
  plano_id         BIGINT NOT NULL REFERENCES app.planos(id),
  data_inicio      DATE NOT NULL,
  data_vencimento  DATE NOT NULL,                  -- fim do contrato
  status           VARCHAR(10) NOT NULL DEFAULT 'ATIVA'
                   CHECK (status IN ('ATIVA','CANCELADA','ENCERRADA')),
  observacoes      VARCHAR(255),                   -- alterações contratuais
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (data_vencimento > data_inicio)
);
CREATE INDEX idx_matriculas_aluno ON app.matriculas (aluno_id, status);

CREATE TABLE app.registros_acesso (
  id               BIGSERIAL PRIMARY KEY,
  aluno_id         BIGINT NOT NULL REFERENCES app.alunos(id),
  data_hora        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resultado        VARCHAR(10) NOT NULL CHECK (resultado IN ('LIBERADO','BLOQUEADO')),
  motivo_bloqueio  VARCHAR(120),
  operador_id      BIGINT REFERENCES app.operadores(id),
  CHECK (resultado = 'LIBERADO' OR motivo_bloqueio IS NOT NULL)
);
CREATE INDEX idx_acesso_aluno_data ON app.registros_acesso (aluno_id, data_hora DESC);
CREATE INDEX idx_acesso_data       ON app.registros_acesso (data_hora DESC);

CREATE TABLE financeiro.mensalidades (
  id               BIGSERIAL PRIMARY KEY,
  matricula_id     BIGINT NOT NULL REFERENCES app.matriculas(id),
  competencia      DATE NOT NULL,                  -- 1º dia do mês de referência
  valor            NUMERIC(10,2) NOT NULL CHECK (valor > 0),
  data_vencimento  DATE NOT NULL,
  data_pagamento   DATE,
  valor_pago       NUMERIC(10,2) CHECK (valor_pago IS NULL OR valor_pago > 0),
  forma_pagamento  VARCHAR(20),
  status           VARCHAR(10) NOT NULL DEFAULT 'PENDENTE'
                   CHECK (status IN ('PENDENTE','PAGA','ATRASADA','CANCELADA')),
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (matricula_id, competencia),
  CHECK (status <> 'PAGA' OR (data_pagamento IS NOT NULL AND valor_pago IS NOT NULL))
);
CREATE INDEX idx_mens_status_venc ON financeiro.mensalidades (status, data_vencimento);
CREATE INDEX idx_mens_pagamento   ON financeiro.mensalidades (data_pagamento) WHERE status = 'PAGA';

CREATE TABLE audit.auditoria_vencimentos (
  id                   BIGSERIAL PRIMARY KEY,
  mensalidade_id       BIGINT NOT NULL,
  vencimento_anterior  DATE NOT NULL,
  vencimento_novo      DATE NOT NULL,
  alterado_em          TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_responsavel  VARCHAR(160) NOT NULL,
  justificativa        VARCHAR(255)
);
CREATE INDEX idx_audit_venc_mens ON audit.auditoria_vencimentos (mensalidade_id, alterado_em DESC);

-- 5. FUNCTIONS ---------------------------------------------------------
-- 5.1 Há mensalidade em aberto vencida há mais de 5 dias?
CREATE OR REPLACE FUNCTION financeiro.fn_aluno_inadimplente(p_aluno_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql STABLE
SET search_path = pg_catalog, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM financeiro.mensalidades m
      JOIN app.matriculas mt ON mt.id = m.matricula_id
     WHERE mt.aluno_id = p_aluno_id
       AND m.status IN ('PENDENTE','ATRASADA')
       AND CURRENT_DATE > m.data_vencimento + 5
  );
$$;

-- 5.2 Verificação de acesso (cadastro + situação financeira + matrícula)
CREATE OR REPLACE FUNCTION app.fn_verificar_acesso(p_aluno_id BIGINT)
RETURNS TABLE (autorizado BOOLEAN, motivo TEXT)
LANGUAGE plpgsql STABLE
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_status VARCHAR(10);
BEGIN
  SELECT status INTO v_status FROM app.alunos WHERE id = p_aluno_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'ALUNO_NAO_ENCONTRADO'::TEXT; RETURN;
  END IF;
  IF v_status = 'INATIVO' THEN
    RETURN QUERY SELECT FALSE, 'ALUNO_INATIVO'::TEXT; RETURN;
  END IF;
  -- verificação adicional em tempo real (não depende só do status gravado)
  IF v_status = 'BLOQUEADO' OR financeiro.fn_aluno_inadimplente(p_aluno_id) THEN
    RETURN QUERY SELECT FALSE, 'INADIMPLENCIA_SUPERIOR_A_5_DIAS'::TEXT; RETURN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.matriculas
                  WHERE aluno_id = p_aluno_id AND status = 'ATIVA'
                    AND CURRENT_DATE BETWEEN data_inicio AND data_vencimento) THEN
    RETURN QUERY SELECT FALSE, 'SEM_MATRICULA_VIGENTE'::TEXT; RETURN;
  END IF;
  RETURN QUERY SELECT TRUE, NULL::TEXT;
END $$;

-- 5.3 Verifica e REGISTRA a tentativa de acesso
CREATE OR REPLACE FUNCTION app.fn_registrar_acesso(p_aluno_id BIGINT, p_operador_id BIGINT DEFAULT NULL)
RETURNS TABLE (resultado TEXT, motivo TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_ok BOOLEAN; v_motivo TEXT;
BEGIN
  SELECT a.autorizado, a.motivo INTO v_ok, v_motivo FROM app.fn_verificar_acesso(p_aluno_id) a;
  IF v_motivo = 'ALUNO_NAO_ENCONTRADO' THEN
    RETURN QUERY SELECT 'BLOQUEADO'::TEXT, v_motivo; RETURN;  -- sem aluno não há FK para registrar
  END IF;
  INSERT INTO app.registros_acesso (aluno_id, resultado, motivo_bloqueio, operador_id)
  VALUES (p_aluno_id, CASE WHEN v_ok THEN 'LIBERADO' ELSE 'BLOQUEADO' END, v_motivo, p_operador_id);
  RETURN QUERY SELECT (CASE WHEN v_ok THEN 'LIBERADO' ELSE 'BLOQUEADO' END)::TEXT, v_motivo;
END $$;

-- 6. TRIGGERS ----------------------------------------------------------
-- 6.1 Recalcula o status do aluno quando uma mensalidade muda
CREATE OR REPLACE FUNCTION financeiro.tg_atualizar_status_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
  v_aluno BIGINT;
  v_matricula BIGINT := COALESCE(NEW.matricula_id, OLD.matricula_id);
BEGIN
  SELECT aluno_id INTO v_aluno FROM app.matriculas WHERE id = v_matricula;
  UPDATE app.alunos a
     SET status = CASE WHEN financeiro.fn_aluno_inadimplente(a.id) THEN 'BLOQUEADO' ELSE 'ATIVO' END
   WHERE a.id = v_aluno
     AND a.status IN ('ATIVO','BLOQUEADO')        -- INATIVO nunca é alterado automaticamente
     AND a.status <> CASE WHEN financeiro.fn_aluno_inadimplente(a.id) THEN 'BLOQUEADO' ELSE 'ATIVO' END;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_mensalidade_status_aluno
AFTER INSERT OR DELETE OR UPDATE OF status, data_vencimento ON financeiro.mensalidades
FOR EACH ROW EXECUTE FUNCTION financeiro.tg_atualizar_status_aluno();

-- 6.2 Auditoria de alteração de vencimento
-- O backend informa o usuário com: SELECT set_config('app.usuario', 'email', true)
-- e a justificativa com:           SELECT set_config('app.justificativa', 'texto', true)
CREATE OR REPLACE FUNCTION audit.tg_auditar_vencimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  INSERT INTO audit.auditoria_vencimentos
    (mensalidade_id, vencimento_anterior, vencimento_novo, usuario_responsavel, justificativa)
  VALUES (NEW.id, OLD.data_vencimento, NEW.data_vencimento,
          COALESCE(NULLIF(current_setting('app.usuario', true), ''), session_user::TEXT),
          NULLIF(current_setting('app.justificativa', true), ''));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_auditar_vencimento
AFTER UPDATE OF data_vencimento ON financeiro.mensalidades
FOR EACH ROW WHEN (OLD.data_vencimento IS DISTINCT FROM NEW.data_vencimento)
EXECUTE FUNCTION audit.tg_auditar_vencimento();

-- 7. VIEWS -------------------------------------------------------------
CREATE OR REPLACE VIEW financeiro.vw_mensalidades_detalhe AS
SELECT m.id, a.id AS aluno_id, a.nome AS aluno, p.nome AS plano, m.competencia, m.valor,
       m.data_vencimento, m.data_pagamento, m.valor_pago, m.forma_pagamento,
       CASE WHEN m.status = 'PENDENTE' AND CURRENT_DATE > m.data_vencimento THEN 'ATRASADA'
            ELSE m.status END AS status,
       GREATEST(CURRENT_DATE - m.data_vencimento, 0) *
         (m.status IN ('PENDENTE','ATRASADA'))::INT AS dias_atraso
  FROM financeiro.mensalidades m
  JOIN app.matriculas mt ON mt.id = m.matricula_id
  JOIN app.alunos a      ON a.id = mt.aluno_id
  JOIN app.planos p      ON p.id = mt.plano_id;

CREATE OR REPLACE VIEW financeiro.vw_situacao_financeira_aluno AS
SELECT a.id AS aluno_id, a.nome, a.status AS situacao_cadastral,
       COUNT(*) FILTER (WHERE m.status = 'PENDENTE')  AS qtd_pendentes,
       COUNT(*) FILTER (WHERE m.status = 'ATRASADA')  AS qtd_atrasadas,
       COALESCE(SUM(m.valor) FILTER (WHERE m.status IN ('PENDENTE','ATRASADA')), 0) AS total_em_aberto,
       financeiro.fn_aluno_inadimplente(a.id) AS inadimplente
  FROM app.alunos a
  LEFT JOIN app.matriculas mt ON mt.aluno_id = a.id
  LEFT JOIN financeiro.mensalidades m ON m.matricula_id = mt.id
 GROUP BY a.id, a.nome, a.status;

CREATE OR REPLACE VIEW app.vw_dashboard AS
SELECT (SELECT COUNT(*) FROM app.alunos WHERE status = 'ATIVO')     AS alunos_ativos,
       (SELECT COUNT(*) FROM app.alunos WHERE status = 'BLOQUEADO') AS alunos_bloqueados,
       (SELECT COUNT(*) FROM financeiro.mensalidades WHERE status = 'PENDENTE') AS mensalidades_pendentes,
       (SELECT COUNT(*) FROM financeiro.mensalidades WHERE status = 'ATRASADA') AS mensalidades_atrasadas,
       (SELECT COALESCE(SUM(valor_pago),0) FROM financeiro.mensalidades
         WHERE status = 'PAGA' AND date_trunc('month', data_pagamento) = date_trunc('month', CURRENT_DATE))
         AS recebimentos_mes;

-- 8. VIEW MATERIALIZADA DE FATURAMENTO ---------------------------------
CREATE MATERIALIZED VIEW financeiro.mv_faturamento_mensal AS
SELECT date_trunc('month', data_pagamento)::DATE AS mes_referencia,
       COUNT(*)                                   AS quantidade_pagamentos,
       SUM(valor_pago)                            AS total_recebido,
       SUM(SUM(valor_pago)) OVER (ORDER BY date_trunc('month', data_pagamento)) AS valor_total_arrecadado
  FROM financeiro.mensalidades
 WHERE status = 'PAGA'
 GROUP BY date_trunc('month', data_pagamento)
WITH DATA;
CREATE UNIQUE INDEX uq_mv_faturamento_mes ON financeiro.mv_faturamento_mensal (mes_referencia);

-- 9. PROCEDURES --------------------------------------------------------
-- 9.1 Recalcula inadimplência (chamada pelo agendador do Spring e sob demanda)
CREATE OR REPLACE PROCEDURE financeiro.sp_atualizar_inadimplencia(INOUT p_bloqueados INT DEFAULT 0,
                                                                  INOUT p_desbloqueados INT DEFAULT 0)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  -- a) mensalidades pendentes já vencidas passam a ATRASADA
  UPDATE financeiro.mensalidades SET status = 'ATRASADA'
   WHERE status = 'PENDENTE' AND data_vencimento < CURRENT_DATE;

  -- b) bloqueia: ATIVO com mensalidade vencida há mais de 5 dias
  UPDATE app.alunos a SET status = 'BLOQUEADO'
   WHERE a.status = 'ATIVO' AND financeiro.fn_aluno_inadimplente(a.id);
  GET DIAGNOSTICS p_bloqueados = ROW_COUNT;

  -- c) desbloqueia: BLOQUEADO sem inadimplência > 5 dias
  UPDATE app.alunos a SET status = 'ATIVO'
   WHERE a.status = 'BLOQUEADO' AND NOT financeiro.fn_aluno_inadimplente(a.id);
  GET DIAGNOSTICS p_desbloqueados = ROW_COUNT;
END $$;

-- 9.2 Atualiza a view materializada
CREATE OR REPLACE PROCEDURE financeiro.sp_atualizar_faturamento()
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, pg_temp
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY financeiro.mv_faturamento_mensal;
END $$;

-- 10. PERMISSÕES -------------------------------------------------------
GRANT USAGE ON SCHEMA app, financeiro, audit TO rl_leitor, rl_escritor;

-- Leitor: somente SELECT (operadores sem a coluna senha_hash)
GRANT SELECT ON app.alunos, app.planos, app.matriculas, app.registros_acesso,
                financeiro.mensalidades, financeiro.vw_mensalidades_detalhe,
                financeiro.vw_situacao_financeira_aluno, app.vw_dashboard,
                financeiro.mv_faturamento_mensal, audit.auditoria_vencimentos TO rl_leitor;
GRANT SELECT (id, nome, email, perfil, ativo, criado_em) ON app.operadores TO rl_leitor;

-- Escritor: DML necessário (sem DELETE; sem escrita direta na auditoria)
GRANT SELECT (senha_hash) ON app.operadores TO rl_escritor;   -- necessário ao login
GRANT INSERT, UPDATE ON app.alunos, app.planos, app.matriculas, financeiro.mensalidades TO rl_escritor;
GRANT INSERT ON app.registros_acesso TO rl_escritor;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA app, financeiro TO rl_escritor;
GRANT EXECUTE ON FUNCTION app.fn_verificar_acesso(BIGINT), app.fn_registrar_acesso(BIGINT, BIGINT),
                          financeiro.fn_aluno_inadimplente(BIGINT) TO rl_escritor, rl_leitor;
REVOKE EXECUTE ON FUNCTION app.fn_registrar_acesso(BIGINT, BIGINT) FROM rl_leitor;
GRANT EXECUTE ON PROCEDURE financeiro.sp_atualizar_inadimplencia(INT, INT),
                           financeiro.sp_atualizar_faturamento() TO rl_escritor;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA app, financeiro, audit FROM PUBLIC;
REVOKE EXECUTE ON ALL PROCEDURES IN SCHEMA financeiro FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.fn_verificar_acesso(BIGINT), financeiro.fn_aluno_inadimplente(BIGINT)
  TO rl_leitor, rl_escritor;
GRANT EXECUTE ON FUNCTION app.fn_registrar_acesso(BIGINT, BIGINT) TO rl_escritor;

-- 11. SEEDS ------------------------------------------------------------
-- Senhas de DEMONSTRAÇÃO (apenas ambiente local): Admin@123 e Operador@123
INSERT INTO app.operadores (nome, email, senha_hash, perfil) VALUES
 ('Administrador G7', 'admin@g7.local',    crypt('Admin@123',    gen_salt('bf', 10)), 'ADMIN'),
 ('Operador Recepção', 'operador@g7.local', crypt('Operador@123', gen_salt('bf', 10)), 'OPERADOR');

INSERT INTO app.planos (nome, descricao, valor_mensal, duracao_meses) VALUES
 ('Mensal',     'Acesso livre por 1 mês',      120.00, 1),
 ('Trimestral', 'Acesso livre por 3 meses',    105.00, 3),
 ('Semestral',  'Acesso livre por 6 meses',     95.00, 6),
 ('Anual',      'Acesso livre por 12 meses',    80.00, 12);

INSERT INTO app.alunos (nome, cpf, data_nascimento, telefone, email) VALUES
 ('Ana Beatriz Lima',   '11111111111', '1995-03-12', '(62) 99999-0001', 'ana@exemplo.local'),
 ('Bruno Carvalho',     '22222222222', '1990-07-25', '(62) 99999-0002', 'bruno@exemplo.local'),
 ('Carla Menezes',      '33333333333', '1988-11-02', '(62) 99999-0003', 'carla@exemplo.local'),
 ('Diego Ferreira',     '44444444444', '2000-01-30', '(62) 99999-0004', 'diego@exemplo.local'),
 ('Elisa Rocha',        '55555555555', '1998-09-18', '(62) 99999-0005', 'elisa@exemplo.local');

-- Matrículas (uma por aluno)
INSERT INTO app.matriculas (aluno_id, plano_id, data_inicio, data_vencimento)
SELECT a.id, p.id, CURRENT_DATE - 120, CURRENT_DATE + 245
  FROM app.alunos a JOIN app.planos p ON p.nome = 'Anual' WHERE a.cpf IN ('11111111111','22222222222');
INSERT INTO app.matriculas (aluno_id, plano_id, data_inicio, data_vencimento)
SELECT a.id, p.id, CURRENT_DATE - 60, CURRENT_DATE + 120
  FROM app.alunos a JOIN app.planos p ON p.nome = 'Semestral' WHERE a.cpf IN ('33333333333','44444444444');
INSERT INTO app.matriculas (aluno_id, plano_id, data_inicio, data_vencimento)
SELECT a.id, p.id, CURRENT_DATE - 90, CURRENT_DATE + 90
  FROM app.alunos a JOIN app.planos p ON p.nome = 'Semestral' WHERE a.cpf = '55555555555';

-- Mensalidades de demonstração
--  Ana: paga (mês anterior) + pendente (vence em 10 dias)     -> aluno ATIVO
--  Bruno: pendente vencida há 3 dias                           -> inadimplente, ainda NÃO bloqueado
--  Carla: pendente vencida há 10 dias                          -> será BLOQUEADA
--  Diego: paga                                                 -> ATIVO
--  Elisa: paga com atraso e histórico de pagamentos            -> ATIVA
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, data_pagamento, valor_pago, forma_pagamento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE - 31)::DATE, 80, CURRENT_DATE - 25, CURRENT_DATE - 26, 80, 'PIX', 'PAGA'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '11111111111';
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE)::DATE, 80, CURRENT_DATE + 10, 'PENDENTE'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '11111111111';
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE)::DATE, 80, CURRENT_DATE - 3, 'PENDENTE'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '22222222222';
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE - 31)::DATE, 95, CURRENT_DATE - 10, 'PENDENTE'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '33333333333';
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, data_pagamento, valor_pago, forma_pagamento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE)::DATE, 95, CURRENT_DATE - 2, CURRENT_DATE - 1, 95, 'CARTAO', 'PAGA'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '44444444444';
INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento, data_pagamento, valor_pago, forma_pagamento, status)
SELECT mt.id, date_trunc('month', CURRENT_DATE - 31)::DATE, 95, CURRENT_DATE - 28, CURRENT_DATE - 20, 95, 'DINHEIRO', 'PAGA'
  FROM app.matriculas mt JOIN app.alunos a ON a.id = mt.aluno_id WHERE a.cpf = '55555555555';

-- Estado inicial coerente: aplica a regra e atualiza o faturamento
CALL financeiro.sp_atualizar_inadimplencia();
REFRESH MATERIALIZED VIEW financeiro.mv_faturamento_mensal;
