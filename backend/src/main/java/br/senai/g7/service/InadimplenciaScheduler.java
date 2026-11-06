package br.senai.g7.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * A passagem do tempo não dispara trigger no PostgreSQL. Por isso o backend executa periodicamente
 * a Procedure financeiro.sp_atualizar_inadimplencia (bloqueio/desbloqueio) e atualiza o faturamento.
 */
@Component
public class InadimplenciaScheduler {
    private static final Logger log = LoggerFactory.getLogger(InadimplenciaScheduler.class);
    private final FinanceiroService financeiro;

    public InadimplenciaScheduler(FinanceiroService financeiro) { this.financeiro = financeiro; }

    @Scheduled(initialDelay = 20000, fixedDelayString = "${g7.inadimplencia.intervalo-ms}")
    public void executar() {
        try {
            var r = financeiro.recalcularInadimplencia();
            financeiro.atualizarFaturamento();
            log.info("Inadimplência recalculada: {} bloqueado(s), {} desbloqueado(s)", r.bloqueados(), r.desbloqueados());
        } catch (Exception e) {
            log.error("Falha ao executar a Procedure de inadimplência", e);
        }
    }
}
