package br.senai.g7.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Usuário autenticado extraído do JWT. */
public record AuthUser(long id, String email, String nome, String perfil) {
    public static AuthUser atual() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return (a != null && a.getPrincipal() instanceof AuthUser u) ? u : null;
    }
}
