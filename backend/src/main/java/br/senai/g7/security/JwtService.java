package br.senai.g7.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Gera e valida os tokens JWT. O segredo vem de variável de ambiente e precisa ter ao menos 32
 * caracteres.
 */
@Service
public class JwtService {
    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${g7.jwt.secret}") String secret,
                      @Value("${g7.jwt.expiration-minutes}") long expirationMinutes) {
        if (secret == null || secret.length() < 32) {
            throw new IllegalStateException("JWT_SECRET deve ter pelo menos 32 caracteres");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMinutes = expirationMinutes;
    }

    public String gerar(AuthUser u) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(u.email())
                .claim("uid", u.id())
                .claim("nome", u.nome())
                .claim("perfil", u.perfil())
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusSeconds(expirationMinutes * 60)))
                .signWith(key)
                .compact();
    }

    public Optional<AuthUser> validar(String token) {
        try {
            Claims c = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.of(new AuthUser(((Number) c.get("uid")).longValue(), c.getSubject(),
                    c.get("nome", String.class), c.get("perfil", String.class)));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
