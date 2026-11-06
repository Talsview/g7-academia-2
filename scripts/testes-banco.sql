-- Roteiro de testes do banco G7. Executar como superusuário no banco g7_academia:
--   docker compose exec db psql -U postgres -d g7_academia -f /scripts/testes-banco.sql
-- Cada teste imprime NOTICE "OK - ..." ou aborta com EXCEPTION. Tudo roda em transação e termina em ROLLBACK.
\set ON_ERROR_STOP on
BEGIN;

DO $$
DECLARE v RECORD; n INT; b INT; d INT; a BIGINT;
BEGIN
  -- T1: estado inicial do seed (ativo, inadimplente < 5 dias, bloqueado)
  IF (SELECT status FROM app.alunos WHERE cpf='11111111111') <> 'ATIVO'     THEN RAISE EXCEPTION 'T1 Ana deveria estar ATIVO'; END IF;
  IF (SELECT status FROM app.alunos WHERE cpf='22222222222') <> 'ATIVO'     THEN RAISE EXCEPTION 'T1 Bruno (3 dias de atraso) NAO deve ser bloqueado'; END IF;
  IF (SELECT status FROM app.alunos WHERE cpf='33333333333') <> 'BLOQUEADO' THEN RAISE EXCEPTION 'T1 Carla (10 dias) deveria estar BLOQUEADA'; END IF;
  RAISE NOTICE 'OK - T1 seed: ativo / atraso <= 5 dias nao bloqueia / atraso > 5 dias bloqueia (trigger)';

  -- T2: Function de acesso
  SELECT * INTO v FROM app.fn_verificar_acesso((SELECT id FROM app.alunos WHERE cpf='11111111111'));
  IF NOT v.autorizado THEN RAISE EXCEPTION 'T2 Ana deveria ser autorizada (%)', v.motivo; END IF;
  SELECT * INTO v FROM app.fn_verificar_acesso((SELECT id FROM app.alunos WHERE cpf='33333333333'));
  IF v.autorizado OR v.motivo <> 'INADIMPLENCIA_SUPERIOR_A_5_DIAS' THEN RAISE EXCEPTION 'T2 Carla deveria ser negada'; END IF;
  RAISE NOTICE 'OK - T2 fn_verificar_acesso libera/nega corretamente';

  -- T3: registro de acesso
  PERFORM * FROM app.fn_registrar_acesso((SELECT id FROM app.alunos WHERE cpf='33333333333'));
  IF NOT EXISTS (SELECT 1 FROM app.registros_acesso WHERE resultado='BLOQUEADO' AND motivo_bloqueio IS NOT NULL) THEN
    RAISE EXCEPTION 'T3 acesso bloqueado nao foi registrado'; END IF;
  RAISE NOTICE 'OK - T3 fn_registrar_acesso grava a tentativa com motivo';

  -- T4: desbloqueio apos pagamento (trigger)
  UPDATE financeiro.mensalidades SET status='PAGA', data_pagamento=CURRENT_DATE, valor_pago=95, forma_pagamento='PIX'
   WHERE matricula_id = (SELECT m.id FROM app.matriculas m JOIN app.alunos a ON a.id=m.aluno_id WHERE a.cpf='33333333333');
  IF (SELECT status FROM app.alunos WHERE cpf='33333333333') <> 'ATIVO' THEN RAISE EXCEPTION 'T4 Carla deveria ser desbloqueada'; END IF;
  RAISE NOTICE 'OK - T4 pagamento desbloqueia o aluno automaticamente';

  -- T5: auditoria de vencimento (trigger) com usuario e justificativa
  PERFORM set_config('app.usuario','admin@g7.local',true);
  PERFORM set_config('app.justificativa','Negociacao com o aluno',true);
  UPDATE financeiro.mensalidades SET data_vencimento = data_vencimento + 7
   WHERE matricula_id = (SELECT m.id FROM app.matriculas m JOIN app.alunos a ON a.id=m.aluno_id WHERE a.cpf='22222222222');
  IF NOT EXISTS (SELECT 1 FROM audit.auditoria_vencimentos WHERE usuario_responsavel='admin@g7.local'
                  AND justificativa='Negociacao com o aluno' AND vencimento_novo = vencimento_anterior + 7) THEN
    RAISE EXCEPTION 'T5 auditoria nao registrada'; END IF;
  RAISE NOTICE 'OK - T5 trigger de auditoria registra anterior/novo/usuario/justificativa';

  -- T6: Procedure bloqueia quem passou do prazo e desbloqueia quem regularizou
  --     (simula passagem do tempo: Bruno com vencimento ha 8 dias; tg. dispara via UPDATE)
  UPDATE financeiro.mensalidades SET data_vencimento = CURRENT_DATE - 8
   WHERE matricula_id = (SELECT m.id FROM app.matriculas m JOIN app.alunos a ON a.id=m.aluno_id WHERE a.cpf='22222222222');
  UPDATE app.alunos SET status='ATIVO' WHERE cpf='22222222222';        -- desfaz o efeito do trigger
  CALL financeiro.sp_atualizar_inadimplencia(b, d);
  IF b <> 1 OR (SELECT status FROM app.alunos WHERE cpf='22222222222') <> 'BLOQUEADO' THEN
    RAISE EXCEPTION 'T6 procedure deveria bloquear Bruno (bloqueados=%)', b; END IF;
  RAISE NOTICE 'OK - T6 sp_atualizar_inadimplencia bloqueou % aluno(s)', b;

  -- T7: aluno INATIVO nunca e reativado automaticamente
  UPDATE app.alunos SET status='INATIVO' WHERE cpf='22222222222';
  CALL financeiro.sp_atualizar_inadimplencia(b, d);
  IF (SELECT status FROM app.alunos WHERE cpf='22222222222') <> 'INATIVO' THEN RAISE EXCEPTION 'T7 INATIVO foi alterado'; END IF;
  RAISE NOTICE 'OK - T7 aluno INATIVO preservado';

  -- T8: views
  IF (SELECT COUNT(*) FROM financeiro.vw_situacao_financeira_aluno) <> 5 THEN RAISE EXCEPTION 'T8 view situacao'; END IF;
  IF (SELECT alunos_ativos FROM app.vw_dashboard) IS NULL THEN RAISE EXCEPTION 'T8 dashboard'; END IF;
  IF (SELECT COUNT(*) FROM financeiro.vw_mensalidades_detalhe) <> 6 THEN RAISE EXCEPTION 'T8 view detalhe'; END IF;
  RAISE NOTICE 'OK - T8 views vw_situacao_financeira_aluno, vw_dashboard e vw_mensalidades_detalhe';

  -- T9: view materializada
  CALL financeiro.sp_atualizar_faturamento();
  IF (SELECT SUM(total_recebido) FROM financeiro.mv_faturamento_mensal)
     <> (SELECT SUM(valor_pago) FROM financeiro.mensalidades WHERE status='PAGA') THEN
    RAISE EXCEPTION 'T9 materialized view divergente'; END IF;
  RAISE NOTICE 'OK - T9 sp_atualizar_faturamento sincroniza a view materializada';

  -- T10: senha com BCrypt (pgcrypto) verificavel
  IF NOT EXISTS (SELECT 1 FROM app.operadores WHERE email='admin@g7.local'
                  AND senha_hash LIKE '$2a$%' AND senha_hash = crypt('Admin@123', senha_hash)) THEN
    RAISE EXCEPTION 'T10 hash BCrypt invalido'; END IF;
  RAISE NOTICE 'OK - T10 senhas em BCrypt via pgcrypto';
END $$;

ROLLBACK;
