package br.senai.g7.repository;

import br.senai.g7.dto.Dtos.*;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Persistência de planos (listar, buscar, inserir e atualizar) com SQL parametrizado.
 */
@Repository
public class PlanoRepository {
    private static final RowMapper<PlanoResponse> MAP = (rs, i) -> new PlanoResponse(rs.getLong("id"),
            rs.getString("nome"), rs.getString("descricao"), rs.getBigDecimal("valor_mensal"),
            rs.getInt("duracao_meses"), rs.getBoolean("ativo"), rs.getObject("data_cadastro", LocalDate.class));
    private static final String COLS = "id, nome, descricao, valor_mensal, duracao_meses, ativo, data_cadastro";

    private final NamedParameterJdbcTemplate jdbc;
    public PlanoRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public List<PlanoResponse> listar(boolean apenasAtivos) {
        return jdbc.query("SELECT " + COLS + " FROM app.planos" + (apenasAtivos ? " WHERE ativo" : "")
                + " ORDER BY duracao_meses, nome", MAP);
    }

    public Optional<PlanoResponse> buscar(long id) {
        return jdbc.query("SELECT " + COLS + " FROM app.planos WHERE id = :id", Map.of("id", id), MAP)
                .stream().findFirst();
    }

    public long inserir(PlanoRequest r) {
        return jdbc.queryForObject("""
            INSERT INTO app.planos (nome, descricao, valor_mensal, duracao_meses, ativo)
            VALUES (:nome, :desc, :valor, :dur, :ativo) RETURNING id""", params(r), Long.class);
    }

    public int atualizar(long id, PlanoRequest r) {
        return jdbc.update("""
            UPDATE app.planos SET nome=:nome, descricao=:desc, valor_mensal=:valor, duracao_meses=:dur, ativo=:ativo
             WHERE id=:id""", params(r).addValue("id", id));
    }

    private MapSqlParameterSource params(PlanoRequest r) {
        return new MapSqlParameterSource().addValue("nome", r.nome().trim()).addValue("desc", r.descricao())
                .addValue("valor", r.valorMensal()).addValue("dur", r.duracaoMeses())
                .addValue("ativo", r.ativo() == null || r.ativo());
    }
}
