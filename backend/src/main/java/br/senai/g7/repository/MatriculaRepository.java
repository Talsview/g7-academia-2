package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Persistência de matrículas, incluindo a checagem de matrícula ativa por aluno.
 */
@Repository
public class MatriculaRepository {
    private static final RowMapper<MatriculaResponse> MAP = (rs, i) -> new MatriculaResponse(rs.getLong("id"),
            rs.getLong("aluno_id"), rs.getString("aluno"), rs.getLong("plano_id"), rs.getString("plano"),
            rs.getObject("data_inicio", LocalDate.class), rs.getObject("data_vencimento", LocalDate.class),
            rs.getString("status"), rs.getString("observacoes"));
    private static final String SELECT = """
        SELECT m.id, m.aluno_id, a.nome AS aluno, m.plano_id, p.nome AS plano, m.data_inicio,
               m.data_vencimento, m.status, m.observacoes
          FROM app.matriculas m JOIN app.alunos a ON a.id = m.aluno_id JOIN app.planos p ON p.id = m.plano_id""";

    private final NamedParameterJdbcTemplate jdbc;
    public MatriculaRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<MatriculaResponse> listar(Long alunoId, String status) {
        StringBuilder sql = new StringBuilder(SELECT + " WHERE 1=1");
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (alunoId != null) { sql.append(" AND m.aluno_id = :aluno"); p.addValue("aluno", alunoId); }
        if (status != null && !status.isBlank()) { sql.append(" AND m.status = :status"); p.addValue("status", status); }
        sql.append(" ORDER BY m.id DESC LIMIT 500");
        return jdbc.query(sql.toString(), p, MAP);
    }

    public Optional<MatriculaResponse> buscar(long id) {
        return jdbc.query(SELECT + " WHERE m.id = :id", Map.of("id", id), MAP).stream().findFirst();
    }

    public boolean existeAtiva(long alunoId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
            "SELECT EXISTS (SELECT 1 FROM app.matriculas WHERE aluno_id = :a AND status = 'ATIVA')",
            Map.of("a", alunoId), Boolean.class));
    }

    public long inserir(long alunoId, long planoId, LocalDate inicio, LocalDate fim, String obs) {
        return jdbc.queryForObject("""
            INSERT INTO app.matriculas (aluno_id, plano_id, data_inicio, data_vencimento, observacoes)
            VALUES (:a, :p, :i, :f, :o) RETURNING id""",
            new MapSqlParameterSource().addValue("a", alunoId).addValue("p", planoId)
                .addValue("i", inicio).addValue("f", fim).addValue("o", obs), Long.class);
    }

    public int alterar(long id, String status, String obs) {
        return jdbc.update("UPDATE app.matriculas SET status = :s, observacoes = :o WHERE id = :id",
            new MapSqlParameterSource().addValue("s", status).addValue("o", obs).addValue("id", id));
    }
}
