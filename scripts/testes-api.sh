#!/usr/bin/env bash
# Testes de ponta a ponta da API REST (curl). Requer o sistema no ar e o banco com os seeds originais.
#   bash scripts/testes-api.sh            (Git Bash / WSL no Windows)
API=${API:-http://localhost:8080}
pass=0; fail=0
ok()   { echo "OK    - $1"; pass=$((pass+1)); }
nok()  { echo "FALHA - $1"; fail=$((fail+1)); }
code() { curl -s -o /tmp/g7_body -w '%{http_code}' "$@"; }
chk()  { [ "$2" = "$3" ] && ok "$1" || nok "$1 (esperado $2, obtido $3)"; }
has()  { grep -q "$2" /tmp/g7_body && ok "$1" || nok "$1 (resposta: $(head -c 200 /tmp/g7_body))"; }
jid()  { sed -E 's/^\[?\{"id":([0-9]+).*/\1/' /tmp/g7_body; }
J='Content-Type: application/json'

chk "Login invalido retorna 401" 401 "$(code -X POST $API/api/auth/login -H "$J" -d '{"email":"admin@g7.local","senha":"errada"}')"
chk "Login do ADMIN retorna 200" 200 "$(code -X POST $API/api/auth/login -H "$J" -d '{"email":"admin@g7.local","senha":"Admin@123"}')"
ADM=$(sed -E 's/.*"token":"([^"]+)".*/\1/' /tmp/g7_body)
code -X POST $API/api/auth/login -H "$J" -d '{"email":"operador@g7.local","senha":"Operador@123"}' >/dev/null
OPE=$(sed -E 's/.*"token":"([^"]+)".*/\1/' /tmp/g7_body)
A="Authorization: Bearer $ADM"; O="Authorization: Bearer $OPE"

chk "Rota protegida sem token retorna 401" 401 "$(code $API/api/alunos)"
chk "OPERADOR nao acessa auditoria (403)" 403 "$(code -H "$O" $API/api/auditoria/vencimentos)"
chk "OPERADOR nao cria plano (403)" 403 "$(code -X POST -H "$O" -H "$J" $API/api/planos -d '{"nome":"Z","valorMensal":10,"duracaoMeses":1}')"
chk "ADMIN cria plano (201)" 201 "$(code -X POST -H "$A" -H "$J" $API/api/planos -d '{"nome":"Plano Teste '$RANDOM'","descricao":"t","valorMensal":99.9,"duracaoMeses":2}')"
PLANO=$(jid)
CPF=$(printf '%011d' $((RANDOM*100000+RANDOM)))
chk "Cadastro de aluno (201)" 201 "$(code -X POST -H "$O" -H "$J" $API/api/alunos -d '{"nome":"Aluno Teste","cpf":"'$CPF'","dataNascimento":"1999-05-10","telefone":"62999990000","email":"t@t.com"}')"
ALUNO=$(jid)
chk "CPF duplicado retorna 409" 409 "$(code -X POST -H "$O" -H "$J" $API/api/alunos -d '{"nome":"Dup","cpf":"'$CPF'","dataNascimento":"1999-05-10"}')"
chk "CPF invalido retorna 400" 400 "$(code -X POST -H "$O" -H "$J" $API/api/alunos -d '{"nome":"X","cpf":"123","dataNascimento":"1999-05-10"}')"
HOJE=$(date +%F)
chk "Matricula (201)" 201 "$(code -X POST -H "$O" -H "$J" $API/api/matriculas -d '{"alunoId":'$ALUNO',"planoId":'$PLANO',"dataInicio":"'$HOJE'"}')"
code -H "$O" "$API/api/mensalidades?alunoId=$ALUNO" >/dev/null
chk "Mensalidades foram geradas (2)" 2 "$(grep -o '"id"' /tmp/g7_body | wc -l | tr -d ' ')"
code -H "$O" "$API/api/mensalidades?alunoId=$ALUNO&status=PENDENTE" >/dev/null; M1=$(jid)
chk "Registro de pagamento (200)" 200 "$(code -X POST -H "$O" -H "$J" $API/api/mensalidades/$M1/pagamento -d '{"valorPago":99.9,"formaPagamento":"PIX"}')"
chk "Pagar duas vezes retorna 409" 409 "$(code -X POST -H "$O" -H "$J" $API/api/mensalidades/$M1/pagamento -d '{"valorPago":99.9,"formaPagamento":"PIX"}')"

# Dados de demonstracao: Carla (CPF 33333333333) esta bloqueada por atraso de 10 dias
code -H "$O" "$API/api/alunos?busca=33333333333" >/dev/null; CARLA=$(jid)
code -X POST -H "$O" -H "$J" $API/api/acessos -d '{"alunoId":'$CARLA'}' >/dev/null
has "Acesso da aluna inadimplente e BLOQUEADO" '"resultado":"BLOQUEADO"'
has "Motivo do bloqueio informado" 'INADIMPLENCIA_SUPERIOR_A_5_DIAS'
code -H "$O" "$API/api/mensalidades?alunoId=$CARLA&status=ATRASADA" >/dev/null; MC=$(jid)
chk "Pagamento da mensalidade em atraso (200)" 200 "$(code -X POST -H "$O" -H "$J" $API/api/mensalidades/$MC/pagamento -d '{"valorPago":95,"formaPagamento":"PIX"}')"
code -H "$O" $API/api/alunos/$CARLA >/dev/null; has "Aluno desbloqueado automaticamente apos pagar (trigger)" '"status":"ATIVO"'
code -X POST -H "$O" -H "$J" $API/api/acessos -d '{"alunoId":'$CARLA'}' >/dev/null
has "Acesso liberado apos regularizacao" '"resultado":"LIBERADO"'

# Auditoria de vencimento (Bruno, CPF 22222222222, vencida ha 3 dias)
code -H "$O" "$API/api/alunos?busca=22222222222" >/dev/null; BRUNO=$(jid)
code -H "$O" "$API/api/mensalidades?alunoId=$BRUNO&status=ATRASADA" >/dev/null; MB=$(jid)
NOVO=$(date -d '+7 days' +%F 2>/dev/null || date -v+7d +%F)
chk "Alteracao de vencimento (200)" 200 "$(code -X PATCH -H "$O" -H "$J" $API/api/mensalidades/$MB/vencimento -d '{"novoVencimento":"'$NOVO'","justificativa":"Teste automatizado"}')"
code -H "$A" "$API/api/auditoria/vencimentos?mensalidadeId=$MB" >/dev/null
has "Auditoria registrou a alteracao (trigger)" 'Teste automatizado'
chk "Dashboard (200)" 200 "$(code -H "$O" $API/api/dashboard)"
chk "Procedure de inadimplencia via API (200)" 200 "$(code -X POST -H "$A" -H "$J" $API/api/financeiro/inadimplencia/recalcular)"
chk "Refresh da view materializada via API (200)" 200 "$(code -X POST -H "$A" -H "$J" $API/api/financeiro/faturamento/atualizar)"
echo; echo "Resultado: $pass OK, $fail falha(s)"; [ "$fail" -eq 0 ]
