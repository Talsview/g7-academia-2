package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.AcessoResponse;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Registro e consulta de acessos. A decisão de liberar ou bloquear é da Function
 * app.fn_registrar_acesso, no PostgreSQL.
 */
@Repository
public class AcessoRepository {
    private static final RowMapper<AcessoResponse> MAP = (rs, i) -> new AcessoResponse(rs.getLong("id"),
            rs.getLong("aluno_id"), rs.getString("aluno"), rs.getObject("data_hora", OffsetDateTime.class),
            rs.getString("resultado"), rs.getString("motivo_bloqueio"));
    private static final String SELECT = """
        SELECT r.id, r.aluno_id, a.nome AS aluno, r.data_hora, r.resultado, r.motivo_bloqueio
          FROM app.registros_acesso r JOIN app.alunos a ON a.id = r.aluno_id""";

    private final NamedParameterJdbcTemplate jdbc;
    public AcessoRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    /** Chama a Function do banco, que valida (cadastro + financeiro + matrícula) e grava o registro. */
    public AcessoResponse registrar(long alunoId, long operadorId) {
        jdbc.query("SELECT resultado, motivo FROM app.fn_registrar_acesso(CAST(:a AS bigint), CAST(:o AS bigint))",
            Map.of("a", alunoId, "o", operadorId), rs -> { });
        return jdbc.query(SELECT + " WHERE r.aluno_id = :a ORDER BY r.id DESC LIMIT 1", Map.of("a", alunoId), MAP)
                .get(0);
    }

    public List<AcessoResponse> listar(Long alunoId, String resultado, int limite) {
        StringBuilder sql = new StringBuilder(SELECT + " WHERE 1=1");
        MapSqlParameterSource p = new MapSqlParameterSource().addValue("lim", limite);
        if (alunoId != null) { sql.append(" AND r.aluno_id = :aluno"); p.addValue("aluno", alunoId); }
        if (resultado != null && !resultado.isBlank()) { sql.append(" AND r.resultado = :res"); p.addValue("res", resultado); }
        sql.append(" ORDER BY r.data_hora DESC, r.id DESC LIMIT :lim");
        return jdbc.query(sql.toString(), p, MAP);
    }
}
