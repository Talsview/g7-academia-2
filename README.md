# G7 — Sistema de Controle de Frequência e Mensalidades de Academia

Aplicação web Fullstack **interna (Single Tenant)** para gerenciar alunos, planos, matrículas, mensalidades e acessos de uma academia. Projeto da disciplina *Desenvolvimento de Aplicações Fullstack com Administração e Segurança Avançada no PostgreSQL* (Grupo G7).

## Tecnologias
| Camada | Tecnologia |
|---|---|
| Backend | Java 21, Spring Boot 3.3, Spring Security (JWT + BCrypt), JDBC (`NamedParameterJdbcTemplate`, prepared statements), HikariCP |
| Frontend | Angular 18 (SPA, standalone components), TypeScript, HTML5/CSS3, Nginx |
| Banco | PostgreSQL 16, pgcrypto, PgBouncer 1.22+ |
| Infra | Docker, Docker Compose |

## Arquitetura
Veja o diagrama Mermaid e a descrição completa em [`docs/arquitetura.md`](docs/arquitetura.md).

`Navegador → Nginx/Angular (:4200) → /api → Spring Boot (:8080) → PgBouncer (:6432) → PostgreSQL (:5432)`

> **Decisão documentada:** o enunciado cita três serviços (db, backend, frontend), mas exige PgBouncer; ele foi adicionado como serviço auxiliar de infraestrutura entre o backend e o banco.

**Decisão de persistência:** o backend usa JDBC puro (Repositories com SQL explícito) em vez de JPA, porque grande parte da lógica está no banco (Function, Procedures, Views, Triggers) e o SQL explícito deixa isso visível e demonstrável. As respostas são `records` (DTOs).

## Requisitos
- Docker Desktop (Windows) com Docker Compose v2.
- Git Bash ou WSL (apenas para os scripts `.sh` de teste).

## Instalação e execução (Windows)
Na **raiz do projeto** (pasta `g7-academia`), no PowerShell ou Git Bash:
```bash
copy .env.example .env        # PowerShell/CMD   (Git Bash: cp .env.example .env)
# edite .env e troque as senhas e o JWT_SECRET (mín. 32 caracteres)
docker compose up --build
```
- Aplicação: http://localhost:4200
- API (somente localhost): http://localhost:8080
- PostgreSQL (somente localhost, uso opcional): `127.0.0.1:5433`

O banco só é inicializado na **primeira** subida do volume. Para recriar do zero: `docker compose down -v` e depois `docker compose up --build`.

### Credenciais de demonstração (exclusivas do ambiente local)
| Perfil | E-mail | Senha |
|---|---|---|
| ADMIN | `admin@g7.local` | `Admin@123` |
| OPERADOR | `operador@g7.local` | `Operador@123` |

Senhas de banco e `JWT_SECRET` ficam no `.env` (não versionado).

### Permissões na API
| Recurso | ADMIN | OPERADOR |
|---|---|---|
| Alunos, matrículas, mensalidades, acessos, dashboard | ✔ | ✔ |
| Planos (criar/editar) | ✔ | consulta |
| Auditoria, recálculo de inadimplência, refresh do faturamento | ✔ | ✘ (403) |

## Banco de dados
Arquivos em `bd/`: `postgresql.conf`, `pg_hba.conf`, `pgbouncer.ini`, `backup.sql` (estrutura + seeds), `init-usuarios.sh` (cria usuários com senhas do `.env`).

**Schemas:** `app` (operadores, alunos, planos, matrículas, registros_acesso) · `financeiro` (mensalidades, views, view materializada) · `audit` (auditoria_vencimentos).

**Roles e usuários**
| Role/usuário | Tipo | Permissões |
|---|---|---|
| `rl_leitor` | grupo | SELECT (sem `senha_hash`) |
| `rl_escritor` | grupo (herda leitor) | INSERT/UPDATE nas tabelas de negócio; sem DELETE; sem escrita direta em `audit`; EXECUTE nas rotinas |
| `app_user` | login (backend) | membro de `rl_escritor`, não é superusuário |
| `leitor_user` | login (consultas) | membro de `rl_leitor` |

**Functions**
- `financeiro.fn_aluno_inadimplente(aluno)` — há mensalidade em aberto com `CURRENT_DATE > data_vencimento + 5`?
- `app.fn_verificar_acesso(aluno)` — autoriza ou nega (inativo, inadimplente, sem matrícula vigente).
- `app.fn_registrar_acesso(aluno, operador)` — verifica e grava a tentativa em `registros_acesso`.

**Procedures**
- `financeiro.sp_atualizar_inadimplencia(INOUT bloqueados, INOUT desbloqueados)` — marca mensalidades ATRASADA, bloqueia e desbloqueia alunos (aluno INATIVO nunca é alterado).
- `financeiro.sp_atualizar_faturamento()` — `REFRESH MATERIALIZED VIEW CONCURRENTLY`.

**Triggers**
- `trg_mensalidade_status_aluno` — recalcula o status do aluno quando uma mensalidade é inserida, removida ou tem status/vencimento alterado.
- `trg_auditar_vencimento` — registra em `audit.auditoria_vencimentos` (anterior, novo, data/hora, usuário, justificativa). O backend informa usuário e justificativa com `set_config('app.usuario'|'app.justificativa', ..., true)` na mesma transação.

**Views:** `financeiro.vw_mensalidades_detalhe`, `financeiro.vw_situacao_financeira_aluno`, `app.vw_dashboard`. **Materialized View:** `financeiro.mv_faturamento_mensal` (mês, quantidade de pagamentos, total recebido, total arrecadado acumulado).

**Regra de inadimplência (3 camadas):** (1) trigger ao alterar mensalidades; (2) Procedure agendada pelo Spring a cada 5 min (`@Scheduled`), pois a passagem do tempo não dispara trigger; (3) revalidação em tempo real na Function de acesso.

**Segurança:** pgcrypto (senhas dos seeds com `crypt(..., gen_salt('bf'))`, BCrypt compatível com Spring); `scram-sha-256`; `pg_hba.conf` só aceita 127.0.0.1 e a rede `172.28.0.0/24`; `statement_timeout=30s`; `idle_in_transaction_session_timeout=60s`; `REVOKE` de acesso público; funções `SECURITY DEFINER` com `search_path` fixo; JWT com segredo por variável de ambiente; CORS restrito à origem configurada; prepared statements em todas as consultas.

**PgBouncer:** `pool_mode=transaction`, `default_pool_size=10` (Hikari `maximum-pool-size=10`), `max_prepared_statements=100` (permite prepared statements nomeados), autenticação SCRAM. O `userlist.txt` é gerado em `/tmp` na subida do container a partir do `.env` (nenhum segredo no repositório).

**Dados de demonstração:** Ana (ativa, mensalidade paga e outra a vencer), Bruno (vencida há 3 dias — inadimplente, **não** bloqueado), Carla (vencida há 10 dias — **bloqueada**), Diego e Elisa (em dia). As datas são relativas à data de execução.

## API REST (principais endpoints)
Autenticação: `Authorization: Bearer <token>` (exceto login). Erros: JSON `{timestamp,status,erro,detalhes}`.

| Método e rota | Descrição |
|---|---|
| `POST /api/auth/login` | Login (`email`, `senha`) → token JWT |
| `GET/POST /api/alunos` · `GET/PUT/DELETE /api/alunos/{id}` | CRUD (DELETE = desativar) |
| `PATCH /api/alunos/{id}/reativar` · `GET /api/alunos/{id}/situacao-financeira` | Reativação e situação financeira |
| `GET/POST /api/planos` · `GET/PUT /api/planos/{id}` | Planos (escrita: ADMIN) |
| `GET/POST /api/matriculas` · `GET/PATCH /api/matriculas/{id}` | Matrículas e alteração contratual |
| `GET/POST /api/mensalidades` · `GET /api/mensalidades/{id}` | Consulta e lançamento |
| `POST /api/mensalidades/{id}/pagamento` | Registro de pagamento |
| `PATCH /api/mensalidades/{id}/vencimento` | Altera vencimento (gera auditoria) |
| `POST /api/mensalidades/{id}/cancelar` | Cancela mensalidade em aberto |
| `POST /api/acessos` · `GET /api/acessos` | Registra tentativa de acesso · histórico |
| `GET /api/dashboard` | Indicadores e acessos recentes |
| `GET /api/financeiro/faturamento` | Lê a view materializada |
| `POST /api/financeiro/faturamento/atualizar` | ADMIN: Procedure de refresh |
| `POST /api/financeiro/inadimplencia/recalcular` | ADMIN: Procedure de inadimplência |
| `GET /api/auditoria/vencimentos?mensalidadeId=` | ADMIN: auditoria |

## Testes
Com os containers no ar, na raiz do projeto:
```bash
# 1) Banco (Function, Procedure, Triggers, Views, MV, auditoria, BCrypt) — roda em transação com ROLLBACK
docker compose exec db psql -U postgres -d g7_academia -f /scripts/testes-banco.sql

# 2) Permissões, timeouts e PgBouncer
bash scripts/testes-permissoes.sh

# 3) API ponta a ponta (login, CRUD, pagamento, bloqueio/desbloqueio, auditoria, perfis)
bash scripts/testes-api.sh
```
O `testes-api.sh` altera dados (cria aluno/plano e paga mensalidades dos seeds); para repetir, recrie o banco com `docker compose down -v`.

## Comandos úteis
```bash
docker compose ps                     # estado e healthchecks
docker compose logs -f backend        # logs do backend
docker compose exec db psql -U postgres -d g7_academia   # console SQL
docker compose down -v                # derruba tudo e apaga o volume do banco
```
Desenvolvimento do frontend sem Docker (pasta `frontend`): `npm install` e `npx ng serve --proxy-config proxy.conf.json`.

## Estrutura do repositório
```
backend/    Spring Boot (controller, service, repository, dto, security, config, exception)
frontend/   Angular (core/{models,services,guards,interceptors}, layout, features/*)
bd/         postgresql.conf, pg_hba.conf, pgbouncer.ini, backup.sql, init-usuarios.sh
scripts/    testes-banco.sql, testes-permissoes.sh, testes-api.sh
apresentacao/  roteiro.md
docs/       arquitetura.md
```
Volumes e dados físicos do PostgreSQL **não** são versionados (volume Docker nomeado `pgdata`).
