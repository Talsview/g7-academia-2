package br.senai.g7.config;

import br.senai.g7.security.JwtAuthFilter;
import br.senai.g7.security.JwtService;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configuração de segurança: API stateless com JWT, regras de acesso por perfil (ADMIN/OPERADOR),
 * BCrypt para senhas e CORS restrito à origem configurada.
 */
@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, JwtService jwt) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)           // API stateless com JWT (sem cookies)
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a -> a
                .requestMatchers("/api/auth/login", "/actuator/health").permitAll()
                .requestMatchers("/api/auditoria/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/planos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.PUT, "/api/planos/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.POST, "/api/financeiro/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) -> escrever(res, 401, "Não autenticado"))
                .accessDeniedHandler((req, res, ex) -> escrever(res, 403, "Acesso negado para o seu perfil")))
            .addFilterBefore(new JwtAuthFilter(jwt), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    private static void escrever(jakarta.servlet.http.HttpServletResponse res, int status, String msg)
            throws java.io.IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE + ";charset=UTF-8");
        res.getWriter().write("{\"status\":" + status + ",\"erro\":\"" + msg + "\",\"detalhes\":[]}");
    }

    /** CORS restritivo: somente a origem configurada (o Nginx do frontend usa mesma origem via proxy). */
    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${g7.cors.allowed-origin}") String origem) {
        CorsConfiguration c = new CorsConfiguration();
        c.setAllowedOrigins(List.of(origem));
        c.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        c.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        c.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource s = new UrlBasedCorsConfigurationSource();
        s.registerCorsConfiguration("/api/**", c);
        return s;
    }
}
