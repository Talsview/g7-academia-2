package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/** Acesso às Procedures, view materializada, dashboard e auditoria. */
@Repository
public class FinanceiroRepository {
    private final NamedParameterJdbcTemplate jdbc;
    private final JdbcTemplate plain;

    public FinanceiroRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
        this.plain = jdbc.getJdbcTemplate();
    }

    public InadimplenciaResponse recalcularInadimplencia() {
        Map<String, Object> r = plain.queryForMap("CALL financeiro.sp_atualizar_inadimplencia()");
        return new InadimplenciaResponse(((Number) r.get("p_bloqueados")).intValue(),
                ((Number) r.get("p_desbloqueados")).intValue());
    }

    public void atualizarFaturamento() { plain.execute("CALL financeiro.sp_atualizar_faturamento()"); }

    public List<FaturamentoResponse> faturamento() {
        return plain.query("""
            SELECT mes_referencia, quantidade_pagamentos, total_recebido, valor_total_arrecadado
              FROM financeiro.mv_faturamento_mensal ORDER BY mes_referencia DESC""",
            (rs, i) -> new FaturamentoResponse(rs.getObject("mes_referencia", LocalDate.class),
                rs.getLong("quantidade_pagamentos"), rs.getBigDecimal("total_recebido"),
                rs.getBigDecimal("valor_total_arrecadado")));
    }

    public DashboardResponse dashboard(List<AcessoResponse> recentes) {
        return plain.queryForObject("""
            SELECT alunos_ativos, alunos_bloqueados, mensalidades_pendentes, mensalidades_atrasadas, recebimentos_mes
              FROM app.vw_dashboard""",
            (rs, i) -> new DashboardResponse(rs.getLong(1), rs.getLong(2), rs.getLong(3), rs.getLong(4),
                rs.getBigDecimal(5), recentes));
    }

    public List<AuditoriaVencimentoResponse> auditoriaVencimentos(Long mensalidadeId) {
        StringBuilder sql = new StringBuilder("""
            SELECT id, mensalidade_id, vencimento_anterior, vencimento_novo, alterado_em, usuario_responsavel, justificativa
              FROM audit.auditoria_vencimentos WHERE 1=1""");
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (mensalidadeId != null) { sql.append(" AND mensalidade_id = :m"); p.addValue("m", mensalidadeId); }
        sql.append(" ORDER BY alterado_em DESC, id DESC LIMIT 500");
        return jdbc.query(sql.toString(), p, (rs, i) -> new AuditoriaVencimentoResponse(rs.getLong("id"),
            rs.getLong("mensalidade_id"), rs.getObject("vencimento_anterior", LocalDate.class),
            rs.getObject("vencimento_novo", LocalDate.class), rs.getObject("alterado_em", OffsetDateTime.class),
            rs.getString("usuario_responsavel"), rs.getString("justificativa")));
    }
}
