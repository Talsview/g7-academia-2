package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.security.AuthUser;
import br.senai.g7.service.MensalidadeService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints REST de mensalidades: consulta, lançamento, pagamento, cancelamento e alteração de
 * vencimento (que dispara a auditoria no banco).
 */
@RestController
@RequestMapping("/api/mensalidades")
public class MensalidadeController {
    private final MensalidadeService service;
    public MensalidadeController(MensalidadeService service) { this.service = service; }

    @GetMapping
    public List<MensalidadeResponse> listar(@RequestParam(required = false) Long alunoId,
                                            @RequestParam(required = false) String status,
                                            @RequestParam(required = false) Long matriculaId) {
        return service.listar(alunoId, status, matriculaId);
    }

    @GetMapping("/{id}")
    public MensalidadeResponse buscar(@PathVariable long id) { return service.buscar(id); }

    @PostMapping
    public ResponseEntity<MensalidadeResponse> criar(@Valid @RequestBody MensalidadeRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.criar(r));
    }

    @PostMapping("/{id}/pagamento")
    public MensalidadeResponse pagar(@PathVariable long id, @Valid @RequestBody PagamentoRequest r) {
        return service.pagar(id, r);
    }

    @PostMapping("/{id}/cancelar")
    public MensalidadeResponse cancelar(@PathVariable long id) { return service.cancelar(id); }

    @PatchMapping("/{id}/vencimento")
    public MensalidadeResponse alterarVencimento(@PathVariable long id, @Valid @RequestBody VencimentoRequest r) {
        return service.alterarVencimento(id, r, AuthUser.atual());
    }
}
