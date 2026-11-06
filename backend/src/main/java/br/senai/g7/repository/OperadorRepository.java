package br.senai.g7.repository;

import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

/**
 * Acesso aos operadores (usuários internos) para o login. Consulta por e-mail com prepared statement.
 */
@Repository
public class OperadorRepository {
    public record OperadorRow(long id, String nome, String email, String senhaHash, String perfil, boolean ativo) {}

    private final NamedParameterJdbcTemplate jdbc;
    public OperadorRepository(NamedParameterJdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Optional<OperadorRow> buscarPorEmail(String email) {
        return jdbc.query("SELECT id, nome, email, senha_hash, perfil, ativo FROM app.operadores WHERE lower(email) = lower(:e)",
                Map.of("e", email),
                (rs, i) -> new OperadorRow(rs.getLong("id"), rs.getString("nome"), rs.getString("email"),
                        rs.getString("senha_hash"), rs.getString("perfil"), rs.getBoolean("ativo")))
            .stream().findFirst();
    }
}
