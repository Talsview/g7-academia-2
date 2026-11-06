package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.OperadorRepository;
import br.senai.g7.security.AuthUser;
import br.senai.g7.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Regra de login: confere a senha com BCrypt e emite o JWT. A mensagem de erro é única para não
 * revelar se o e-mail existe.
 */
@Service
public class AuthService {
    private final OperadorRepository operadores;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(OperadorRepository operadores, PasswordEncoder encoder, JwtService jwt) {
        this.operadores = operadores; this.encoder = encoder; this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest req) {
        // mensagem única evita revelar se o e-mail existe
        var erro = new ApiException(HttpStatus.UNAUTHORIZED, "E-mail ou senha inválidos");
        var op = operadores.buscarPorEmail(req.email()).orElseThrow(() -> erro);
        if (!op.ativo() || !encoder.matches(req.senha(), op.senhaHash())) throw erro;
        String token = jwt.gerar(new AuthUser(op.id(), op.email(), op.nome(), op.perfil()));
        return new LoginResponse(token, op.nome(), op.email(), op.perfil());
    }
}
