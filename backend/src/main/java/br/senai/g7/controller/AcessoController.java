package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.security.AuthUser;
import br.senai.g7.service.AcessoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * Registra tentativas de acesso e consulta o histórico. Bloqueio por inadimplência é um resultado
 * válido (HTTP 200), não um erro.
 */
@RestController
@RequestMapping("/api/acessos")
public class AcessoController {
    private final AcessoService service;
    public AcessoController(AcessoService service) { this.service = service; }

    /** Retorna 200 tanto para LIBERADO quanto para BLOQUEADO (bloqueio é um resultado válido, não um erro). */
    @PostMapping
    public AcessoResponse registrar(@Valid @RequestBody AcessoRequest r) {
        return service.registrar(r, AuthUser.atual());
    }

    @GetMapping
    public List<AcessoResponse> listar(@RequestParam(required = false) Long alunoId,
                                       @RequestParam(required = false) String resultado,
                                       @RequestParam(defaultValue = "100") int limite) {
        return service.listar(alunoId, resultado, limite);
    }
}
