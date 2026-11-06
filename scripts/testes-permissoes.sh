#!/usr/bin/env bash
# Testes de permissões, timeouts, pg_hba e PgBouncer. Executar na raiz do projeto, com os containers no ar:
#   bash scripts/testes-permissoes.sh        (Git Bash / WSL no Windows)
set -u
set -a; . ./.env; set +a
DB="docker compose exec -T"
pass=0; fail=0
t() { # t "descrição" "ok|erro" comando...
  local d="$1" esp="$2"; shift 2
  if "$@" >/dev/null 2>&1; then r=ok; else r=erro; fi
  if [ "$r" = "$esp" ]; then echo "OK    - $d"; pass=$((pass+1)); else echo "FALHA - $d (esperado $esp, obtido $r)"; fail=$((fail+1)); fi
}
leitor() { $DB -e PGPASSWORD="$LEITOR_DB_PASSWORD" db psql -h 127.0.0.1 -U "$LEITOR_DB_USER" -d "$POSTGRES_DB" -tA -c "$1"; }
app()    { $DB -e PGPASSWORD="$APP_DB_PASSWORD"    db psql -h 127.0.0.1 -U "$APP_DB_USER"    -d "$POSTGRES_DB" -tA -c "$1"; }
viapgb() { $DB -e PGPASSWORD="$APP_DB_PASSWORD"    db psql -h pgbouncer -p 6432 -U "$APP_DB_USER" -d "$POSTGRES_DB" -tA -c "$1"; }

t "leitor consegue SELECT na view do dashboard"          ok   leitor "SELECT * FROM app.vw_dashboard"
t "leitor NAO consegue INSERT em planos"                 erro leitor "INSERT INTO app.planos(nome,valor_mensal,duracao_meses) VALUES ('X',1,1)"
t "leitor NAO consegue ler senha_hash"                   erro leitor "SELECT senha_hash FROM app.operadores"
t "escritor consegue ler alunos"                         ok   app    "SELECT count(*) FROM app.alunos"
t "escritor NAO consegue DELETE em alunos"               erro app    "DELETE FROM app.alunos"
t "escritor NAO consegue INSERT direto na auditoria"     erro app    "INSERT INTO audit.auditoria_vencimentos(mensalidade_id,vencimento_anterior,vencimento_novo,usuario_responsavel) VALUES (1,now(),now(),'x')"
t "app_user NAO e superusuario"                          ok   app    "SELECT 1 WHERE NOT (SELECT rolsuper FROM pg_roles WHERE rolname=current_user)"
t "statement_timeout = 30s"                              ok   app    "SELECT 1 WHERE current_setting('statement_timeout')='30s'"
t "idle_in_transaction_session_timeout = 1min"           ok   app    "SELECT 1 WHERE current_setting('idle_in_transaction_session_timeout')='1min'"
t "password_encryption = scram-sha-256"                  ok   app    "SELECT 1 WHERE current_setting('password_encryption')='scram-sha-256'"
t "conexao via PgBouncer funciona (porta 6432)"          ok   viapgb "SELECT 1"
t "senha errada e recusada pelo PgBouncer"               erro $DB -e PGPASSWORD=errada db psql -h pgbouncer -p 6432 -U "$APP_DB_USER" -d "$POSTGRES_DB" -c "SELECT 1"
t "Procedure de inadimplencia executa via PgBouncer"     ok   viapgb "CALL financeiro.sp_atualizar_inadimplencia()"
echo; echo "Resultado: $pass OK, $fail falha(s)"; [ "$fail" -eq 0 ]
