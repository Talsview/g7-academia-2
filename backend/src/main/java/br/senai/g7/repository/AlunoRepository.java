package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Persistência de alunos em JDBC com parâmetros nomeados; filtros montados sem concatenar dados do
 * usuário no SQL.
 */
@Repository
public class AlunoRepository {
    private static final RowMapper<AlunoResponse> MAP = (rs, i) -> new AlunoResponse(
            rs.getLong("id"), rs.getString("nome"), rs.getString("cpf"),
            rs.getObject("data_nascimento", LocalDate.class), rs.getString("telefone"), rs.getString("email"),
            rs.getObject("data_cadastro", LocalDate.class), rs.getString("status"));
    private static final String COLS = "id, nome, cpf, data_nascimento, telefone, email, data_cadastro, status";

    private final NamedParameterJdbcTemplate jdbc;
    public AlunoRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<AlunoResponse> listar(String busca, String status) {
        StringBuilder sql = new StringBuilder("SELECT " + COLS + " FROM app.alunos WHERE 1=1");
        MapSqlParameterSource p = new MapSqlParameterSource();
        if (busca != null && !busca.isBlank()) {
            sql.append(" AND (lower(nome) LIKE :q OR cpf LIKE :q)");
            p.addValue("q", "%" + busca.trim().toLowerCase() + "%");
        }
        if (status != null && !status.isBlank()) {
            sql.append(" AND status = :status");
            p.addValue("status", status);
        }
        sql.append(" ORDER BY nome LIMIT 500");
        return jdbc.query(sql.toString(), p, MAP);
    }

    public Optional<AlunoResponse> buscar(long id) {
        return jdbc.query("SELECT " + COLS + " FROM app.alunos WHERE id = :id", Map.of("id", id), MAP)
                .stream().findFirst();
    }

    public long inserir(AlunoRequest r) {
        return jdbc.queryForObject("""
            INSERT INTO app.alunos (nome, cpf, data_nascimento, telefone, email)
            VALUES (:nome, :cpf, :nasc, :tel, :email) RETURNING id""", params(r), Long.class);
    }

    public int atualizar(long id, AlunoRequest r) {
        return jdbc.update("""
            UPDATE app.alunos SET nome=:nome, cpf=:cpf, data_nascimento=:nasc, telefone=:tel, email=:email
             WHERE id=:id""", params(r).addValue("id", id));
    }

    public int atualizarStatus(long id, String status) {
        return jdbc.update("UPDATE app.alunos SET status = :s WHERE id = :id", Map.of("s", status, "id", id));
    }

    public Optional<SituacaoFinanceiraResponse> situacao(long id) {
        return jdbc.query("""
            SELECT aluno_id, nome, situacao_cadastral, qtd_pendentes, qtd_atrasadas, total_em_aberto, inadimplente
              FROM financeiro.vw_situacao_financeira_aluno WHERE aluno_id = :id""", Map.of("id", id),
            (rs, i) -> new SituacaoFinanceiraResponse(rs.getLong("aluno_id"), rs.getString("nome"),
                rs.getString("situacao_cadastral"), rs.getLong("qtd_pendentes"), rs.getLong("qtd_atrasadas"),
                rs.getBigDecimal("total_em_aberto"), rs.getBoolean("inadimplente"))).stream().findFirst();
    }

    private MapSqlParameterSource params(AlunoRequest r) {
        return new MapSqlParameterSource().addValue("nome", r.nome().trim()).addValue("cpf", r.cpf())
                .addValue("nasc", r.dataNascimento()).addValue("tel", r.telefone()).addValue("email", r.email());
    }
}
