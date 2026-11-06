package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.AlunoRepository;
import br.senai.g7.repository.FinanceiroRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de alunos. 'Excluir' significa desativar (mantém histórico); ao reativar, a regra de
 * inadimplência é reaplicada.
 */
@Service
public class AlunoService {
    private final AlunoRepository alunos;
    private final FinanceiroRepository financeiro;

    public AlunoService(AlunoRepository alunos, FinanceiroRepository financeiro) {
        this.alunos = alunos; this.financeiro = financeiro;
    }

    public List<AlunoResponse> listar(String busca, String status) { return alunos.listar(busca, status); }

    public AlunoResponse buscar(long id) {
        return alunos.buscar(id).orElseThrow(() -> ApiException.naoEncontrado("Aluno não encontrado"));
    }

    @Transactional
    public AlunoResponse criar(AlunoRequest r) { return buscar(alunos.inserir(r)); }

    @Transactional
    public AlunoResponse atualizar(long id, AlunoRequest r) {
        if (alunos.atualizar(id, r) == 0) throw ApiException.naoEncontrado("Aluno não encontrado");
        return buscar(id);
    }

    /** "Excluir" = desativar (mantém o histórico financeiro e de acessos). */
    @Transactional
    public void desativar(long id) {
        if (alunos.atualizarStatus(id, "INATIVO") == 0) throw ApiException.naoEncontrado("Aluno não encontrado");
    }

    /** Reativa como ATIVO e reaplica a regra: se ainda estiver inadimplente > 5 dias, volta a BLOQUEADO. */
    @Transactional
    public AlunoResponse reativar(long id) {
        if (alunos.atualizarStatus(id, "ATIVO") == 0) throw ApiException.naoEncontrado("Aluno não encontrado");
        financeiro.recalcularInadimplencia();
        return buscar(id);
    }

    public SituacaoFinanceiraResponse situacaoFinanceira(long id) {
        return alunos.situacao(id).orElseThrow(() -> ApiException.naoEncontrado("Aluno não encontrado"));
    }
}
