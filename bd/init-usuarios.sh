#!/bin/sh
# Cria os usuários de login com senhas vindas de variáveis de ambiente (nada fixo no código).
set -e
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<SQL
SET password_encryption = 'scram-sha-256';
CREATE ROLE ${APP_DB_USER} LOGIN PASSWORD '${APP_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 20;
CREATE ROLE ${LEITOR_DB_USER} LOGIN PASSWORD '${LEITOR_DB_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE CONNECTION LIMIT 5;
GRANT rl_escritor TO ${APP_DB_USER};
GRANT rl_leitor   TO ${LEITOR_DB_USER};
GRANT CONNECT ON DATABASE ${POSTGRES_DB} TO ${APP_DB_USER}, ${LEITOR_DB_USER};
ALTER ROLE ${APP_DB_USER}    SET statement_timeout = '30s';
ALTER ROLE ${APP_DB_USER}    SET idle_in_transaction_session_timeout = '60s';
ALTER ROLE ${LEITOR_DB_USER} SET statement_timeout = '15s';
ALTER ROLE ${LEITOR_DB_USER} SET idle_in_transaction_session_timeout = '30s';
SQL
