package br.senai.g7.controller;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.service.FinanceiroService;
import java.util.List;
import org.springframework.web.bind.annotation.*;

/**
 * Endpoints do dashboard, do faturamento (view materializada), da execução manual das Procedures e da
 * consulta de auditoria (ADMIN).
 */
@RestController
@RequestMapping("/api")
public class FinanceiroController {
    private final FinanceiroService service;
    public FinanceiroController(FinanceiroService service) { this.service = service; }

    @GetMapping("/dashboard")
    public DashboardResponse dashboard() { return service.dashboard(); }

    @GetMapping("/financeiro/faturamento")
    public List<FaturamentoResponse> faturamento() { return service.faturamento(); }

    /** ADMIN: executa a Procedure de refresh da view materializada. */
    @PostMapping("/financeiro/faturamento/atualizar")
    public List<FaturamentoResponse> atualizarFaturamento() { return service.atualizarFaturamento(); }

    /** ADMIN: executa a Procedure de inadimplência sob demanda (o agendador faz o mesmo periodicamente). */
    @PostMapping("/financeiro/inadimplencia/recalcular")
    public InadimplenciaResponse recalcular() { return service.recalcularInadimplencia(); }

    /** ADMIN: consulta da auditoria de vencimentos. */
    @GetMapping("/auditoria/vencimentos")
    public List<AuditoriaVencimentoResponse> auditoria(@RequestParam(required = false) Long mensalidadeId) {
        return service.auditoria(mensalidadeId);
    }
}
