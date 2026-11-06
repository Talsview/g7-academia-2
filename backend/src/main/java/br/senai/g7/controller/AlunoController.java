package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.service.AlunoService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST de alunos (CRUD, desativação/reativação e situação financeira). Apenas repassa a
 * chamada ao Service.
 */
@RestController
@RequestMapping("/api/alunos")
public class AlunoController {
    private final AlunoService service;
    public AlunoController(AlunoService service) { this.service = service; }

    @GetMapping
    public List<AlunoResponse> listar(@RequestParam(required = false) String busca,
                                      @RequestParam(required = false) String status) {
        return service.listar(busca, status);
    }

    @GetMapping("/{id}")
    public AlunoResponse buscar(@PathVariable long id) { return service.buscar(id); }

    @PostMapping
    public ResponseEntity<AlunoResponse> criar(@Valid @RequestBody AlunoRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(r));
    }

    @PutMapping("/{id}")
    public AlunoResponse atualizar(@PathVariable long id, @Valid @RequestBody AlunoRequest r) {
        return service.atualizar(id, r);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> desativar(@PathVariable long id) {
        service.desativar(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/reativar")
    public AlunoResponse reativar(@PathVariable long id) { return service.reativar(id); }

    @GetMapping("/{id}/situacao-financeira")
    public SituacaoFinanceiraResponse situacao(@PathVariable long id) { return service.situacaoFinanceira(id); }
}
