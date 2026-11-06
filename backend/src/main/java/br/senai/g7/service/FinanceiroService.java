package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.repository.AcessoRepository;
import br.senai.g7.repository.FinanceiroRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Orquestra dashboard, faturamento, recálculo de inadimplência e consulta de auditoria.
 */
@Service
public class FinanceiroService {
    private final FinanceiroRepository financeiro;
    private final AcessoRepository acessos;

    public FinanceiroService(FinanceiroRepository financeiro, AcessoRepository acessos) {
        this.financeiro = financeiro; this.acessos = acessos;
    }

    public DashboardResponse dashboard() { return financeiro.dashboard(acessos.listar(null, null, 10)); }

    public List<FaturamentoResponse> faturamento() { return financeiro.faturamento(); }

    @Transactional
    public List<FaturamentoResponse> atualizarFaturamento() {
        financeiro.atualizarFaturamento();
        return financeiro.faturamento();
    }

    @Transactional
    public InadimplenciaResponse recalcularInadimplencia() { return financeiro.recalcularInadimplencia(); }

    public List<AuditoriaVencimentoResponse> auditoria(Long mensalidadeId) {
        return financeiro.auditoriaVencimentos(mensalidadeId);
    }
}
