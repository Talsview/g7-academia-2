package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.service.PlanoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST de planos. Leitura para todos os perfis; criação e edição liberadas somente ao ADMIN
 * (ver SecurityConfig).
 */
@RestController
@RequestMapping("/api/planos")
public class PlanoController {
    private final PlanoService service;
    public PlanoController(PlanoService service) { this.service = service; }

    @GetMapping
    public List<PlanoResponse> listar(@RequestParam(defaultValue = "false") boolean apenasAtivos) {
        return service.listar(apenasAtivos);
    }

    @GetMapping("/{id}")
    public PlanoResponse buscar(@PathVariable long id) { return service.buscar(id); }

    @PostMapping
    public ResponseEntity<PlanoResponse> criar(@Valid @RequestBody PlanoRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(r));
    }

    @PutMapping("/{id}")
    public PlanoResponse atualizar(@PathVariable long id, @Valid @RequestBody PlanoRequest r) {
        return service.atualizar(id, r);
    }
}
