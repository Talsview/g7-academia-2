# Roteiro de apresentação — G7 (15 minutos)

Arquivo: `apresentacao.pptx` (12 slides; as notas do orador de cada slide trazem o tempo e os pontos a falar).

## Parte 1 — Arquitetura e configurações (10 min)
| # | Slide | Tempo | O que explicar |
|---|---|---|---|
| 1 | Título | 0:20 | Grupo, tema, disciplina; avisar a divisão 10 min + 5 min |
| 2 | Problema e objetivo | 0:50 | Financeiro x acesso; regra dos 5 dias; sistema interno |
| 3 | Funcionalidades | 0:50 | Alunos, planos/matrículas, mensalidades, acesso, dashboard, auditoria |
| 4 | Arquitetura Fullstack | 1:30 | Angular → Nginx → Spring Boot → PgBouncer → PostgreSQL |
| 5 | Docker Compose | 1:00 | 4 serviços (PgBouncer auxiliar), healthchecks, volume, um comando |
| 6 | Schemas e permissões | 1:15 | app/financeiro/audit; rl_leitor, rl_escritor, app_user, leitor_user |
| 7 | Segurança no PostgreSQL | 1:30 | scram, pg_hba, timeouts, pgcrypto/BCrypt, prepared statements |
| 8 | PgBouncer | 0:50 | transaction pooling, Hikari 10 = pool 10, prepared statements |
| 9 | Programação no banco | 1:10 | Functions, Procedures, Triggers, Views, MV |
| 10 | Regra de inadimplência | 0:45 | Trigger + Procedure agendada + Function no acesso |

## Parte 2 — Demonstração (5 min) — slide 11
| Tempo | Passo | Onde |
|---|---|---|
| 0:30 | Login como ADMIN | Tela de login |
| 0:45 | Cadastrar um aluno | Alunos → Novo aluno |
| 0:30 | Consultar planos | Planos |
| 0:45 | Matricular o aluno e ver mensalidades geradas | Matrículas → Mensalidades |
| 0:45 | Inadimplência: **Bruno** (vencida há 3 dias) segue ativo; alterar o vencimento dele para 8 dias atrás | Mensalidades → Vencimento |
| 0:30 | Bloqueio: acesso de Bruno é BLOQUEADO; Dashboard mostra bloqueados | Controle de acesso, Dashboard |
| 0:30 | Pagar a mensalidade → desbloqueio automático → acesso LIBERADO | Mensalidades, Controle de acesso |
| 0:45 | Auditoria da alteração de vencimento e recursos SQL (`scripts/testes-banco.sql`) | Auditoria, terminal |

Slide 12: referências (ABNT) — só para encerrar e abrir perguntas.

Antes de apresentar: `docker compose down -v && docker compose up --build` (as datas dos seeds são relativas ao dia) e ensaiar o roteiro completo.
