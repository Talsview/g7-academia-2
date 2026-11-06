package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * Porta de entrada do login. Recebe e-mail e senha e devolve o token JWT (a validação fica no
 * AuthService).
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest req) { return auth.login(req); }
}
