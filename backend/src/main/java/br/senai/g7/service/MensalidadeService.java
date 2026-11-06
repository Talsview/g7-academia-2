package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.FinanceiroRepository;
import br.senai.g7.repository.MatriculaRepository;
import br.senai.g7.repository.MensalidadeRepository;
import br.senai.g7.security.AuthUser;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras financeiras: pagar só mensalidade em aberto, cancelar e alterar vencimento. Bloqueio,
 * desbloqueio e auditoria são feitos por triggers no banco.
 */
@Service
public class MensalidadeService {
    private final MensalidadeRepository mensalidades;
    private final MatriculaRepository matriculas;
    private final FinanceiroRepository financeiro;

    public MensalidadeService(MensalidadeRepository mensalidades, MatriculaRepository matriculas,
                              FinanceiroRepository financeiro) {
        this.mensalidades = mensalidades; this.matriculas = matriculas; this.financeiro = financeiro;
    }

    public List<MensalidadeResponse> listar(Long alunoId, String status, Long matriculaId) {
        return mensalidades.listar(alunoId, status, matriculaId);
    }

    public MensalidadeResponse buscar(long id) {
        return mensalidades.buscar(id).orElseThrow(() -> ApiException.naoEncontrado("Mensalidade não encontrada"));
    }

    @Transactional
    public MensalidadeResponse criar(MensalidadeRequest r) {
        var mat = matriculas.buscar(r.matriculaId()).orElseThrow(() -> ApiException.naoEncontrado("Matrícula não encontrada"));
        if (!"ATIVA".equals(mat.status())) throw ApiException.regra("Só é possível lançar mensalidade em matrícula ativa");
        return buscar(mensalidades.inserir(r));
    }

    /** O trigger do banco desbloqueia o aluno automaticamente se não restar inadimplência > 5 dias. */
    @Transactional
    public MensalidadeResponse pagar(long id, PagamentoRequest r) {
        buscar(id);
        LocalDate data = r.dataPagamento() != null ? r.dataPagamento() : LocalDate.now();
        if (data.isAfter(LocalDate.now())) throw ApiException.regra("Data de pagamento não pode ser futura");
        if (mensalidades.pagar(id, r.valorPago(), r.formaPagamento(), data) == 0)
            throw ApiException.conflito("Mensalidade não está em aberto (já paga ou cancelada)");
        financeiro.atualizarFaturamento();   // mantém a view materializada de faturamento em dia
        return buscar(id);
    }

    @Transactional
    public MensalidadeResponse cancelar(long id) {
        buscar(id);
        if (mensalidades.cancelar(id) == 0) throw ApiException.conflito("Mensalidade não está em aberto");
        return buscar(id);
    }

    /** A auditoria é gerada pelo TRIGGER; aqui só informamos usuário e justificativa na mesma transação. */
    @Transactional
    public MensalidadeResponse alterarVencimento(long id, VencimentoRequest r, AuthUser usuario) {
        var atual = buscar(id);
        if (r.novoVencimento().equals(atual.dataVencimento()))
            throw ApiException.regra("O novo vencimento é igual ao atual");
        mensalidades.definirContextoAuditoria(usuario.email(), r.justificativa());
        if (mensalidades.alterarVencimento(id, r.novoVencimento()) == 0)
            throw ApiException.conflito("Só é possível alterar o vencimento de mensalidade em aberto");
        return buscar(id);
    }
}
