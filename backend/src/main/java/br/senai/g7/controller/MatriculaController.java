package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.service.MatriculaService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST de matrículas: registrar, consultar e registrar alterações contratuais.
 */
@RestController
@RequestMapping("/api/matriculas")
public class MatriculaController {
    private final MatriculaService service;
    public MatriculaController(MatriculaService service) { this.service = service; }

    @GetMapping
    public List<MatriculaResponse> listar(@RequestParam(required = false) Long alunoId,
                                          @RequestParam(required = false) String status) {
        return service.listar(alunoId, status);
    }

    @GetMapping("/{id}")
    public MatriculaResponse buscar(@PathVariable long id) { return service.buscar(id); }

    @PostMapping
    public ResponseEntity<MatriculaResponse> criar(@Valid @RequestBody MatriculaRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(r));
    }

    @PatchMapping("/{id}")
    public MatriculaResponse alterar(@PathVariable long id, @Valid @RequestBody MatriculaAlteracaoRequest r) {
        return service.alterar(id, r);
    }
}
