package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Persistência de mensalidades. Lê a view vw_mensalidades_detalhe e informa o usuário da auditoria ao
 * banco antes de mudar o vencimento.
 */
@Repository
public class MensalidadeRepository {
    private static final RowMapper<MensalidadeResponse> MAP = (rs, i) -> new MensalidadeResponse(rs.getLong("id"),
            rs.getLong("aluno_id"), rs.getString("aluno"), rs.getString("plano"),
            rs.getObject("competencia", LocalDate.class), rs.getBigDecimal("valor"),
            rs.getObject("data_vencimento", LocalDate.class), rs.getObject("data_pagamento", LocalDate.class),
            rs.getBigDecimal("valor_pago"), rs.getString("forma_pagamento"), rs.getString("status"),
            rs.getInt("dias_atraso"));
    // A view já informa ATRASADA para PENDENTE vencida (visão em tempo real)
    private static final String SELECT = """
        SELECT id, aluno_id, aluno, plano, competencia, valor, data_vencimento, data_pagamento, valor_pago,
               forma_pagamento, status, dias_atraso
          FROM financeiro.vw_mensalidades_detalhe""";

    private final NamedParameterJdbcTemplate jdbc;
    public MensalidadeRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<MensalidadeResponse> listar(Long alunoId, String status, Long matriculaId) {
        StringBuilder sql = new StringBuilder(SELECT + " WHERE 1=1");
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (alunoId != null) { sql.append(" AND aluno_id = :aluno"); p.addValue("aluno", alunoId); }
        if (status != null && !status.isBlank()) { sql.append(" AND status = :status"); p.addValue("status", status); }
        if (matriculaId != null) {
            sql.append(" AND id IN (SELECT id FROM financeiro.mensalidades WHERE matricula_id = :mat)");
            p.addValue("mat", matriculaId);
        }
        sql.append(" ORDER BY data_vencimento DESC, id DESC LIMIT 500");
        return jdbc.query(sql.toString(), p, MAP);
    }

    public Optional<MensalidadeResponse> buscar(long id) {
        return jdbc.query(SELECT + " WHERE id = :id", Map.of("id", id), MAP).stream().findFirst();
    }

    public long inserir(MensalidadeRequest r) {
        return jdbc.queryForObject("""
            INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento)
            VALUES (:m, :c, :v, :d) RETURNING id""",
            new MapSqlParameterSource().addValue("m", r.matriculaId())
                .addValue("c", r.competencia().withDayOfMonth(1)).addValue("v", r.valor())
                .addValue("d", r.dataVencimento()), Long.class);
    }

    public void inserirLote(long matriculaId, LocalDate competencia, BigDecimal valor, LocalDate vencimento) {
        jdbc.update("""
            INSERT INTO financeiro.mensalidades (matricula_id, competencia, valor, data_vencimento)
            VALUES (:m, :c, :v, :d)""",
            new MapSqlParameterSource().addValue("m", matriculaId).addValue("c", competencia)
                .addValue("v", valor).addValue("d", vencimento));
    }

    /** Só paga mensalidade em aberto (PENDENTE/ATRASADA). Retorna linhas afetadas. */
    public int pagar(long id, BigDecimal valorPago, String forma, LocalDate data) {
        return jdbc.update("""
            UPDATE financeiro.mensalidades
               SET status='PAGA', valor_pago=:v, forma_pagamento=:f, data_pagamento=:d
             WHERE id=:id AND status IN ('PENDENTE','ATRASADA')""",
            new MapSqlParameterSource().addValue("v", valorPago).addValue("f", forma)
                .addValue("d", data).addValue("id", id));
    }

    public int cancelar(long id) {
        return jdbc.update("UPDATE financeiro.mensalidades SET status='CANCELADA' WHERE id=:id AND status IN ('PENDENTE','ATRASADA')",
            Map.of("id", id));
    }

    /**
     * Informa quem alterou e por quê. set_config(..., true) vale só na transação corrente,
     * por isso funciona com PgBouncer em transaction pooling. O trigger de auditoria lê esses valores.
     */
    public void definirContextoAuditoria(String usuario, String justificativa) {
        jdbc.queryForObject("SELECT set_config('app.usuario', :u, true)", Map.of("u", usuario), String.class);
        jdbc.queryForObject("SELECT set_config('app.justificativa', :j, true)",
            Map.of("j", justificativa == null ? "" : justificativa), String.class);
    }

    public int alterarVencimento(long id, LocalDate novo) {
        return jdbc.update("""
            UPDATE financeiro.mensalidades SET data_vencimento = :d
             WHERE id = :id AND status IN ('PENDENTE','ATRASADA')""", Map.of("d", novo, "id", id));
    }
}
