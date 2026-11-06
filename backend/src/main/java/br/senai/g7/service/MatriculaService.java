package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.AlunoRepository;
import br.senai.g7.repository.MatriculaRepository;
import br.senai.g7.repository.MensalidadeRepository;
import br.senai.g7.repository.PlanoRepository;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de matrícula: valida aluno e plano, impede duas matrículas ativas e gera as mensalidades
 * conforme a duração do plano.
 */
@Service
public class MatriculaService {
    private final MatriculaRepository matriculas;
    private final AlunoRepository alunos;
    private final PlanoRepository planos;
    private final MensalidadeRepository mensalidades;

    public MatriculaService(MatriculaRepository matriculas, AlunoRepository alunos, PlanoRepository planos,
                            MensalidadeRepository mensalidades) {
        this.matriculas = matriculas; this.alunos = alunos; this.planos = planos; this.mensalidades = mensalidades;
    }

    public List<MatriculaResponse> listar(Long alunoId, String status) { return matriculas.listar(alunoId, status); }

    public MatriculaResponse buscar(long id) {
        return matriculas.buscar(id).orElseThrow(() -> ApiException.naoEncontrado("Matrícula não encontrada"));
    }

    /**
     * Regras: aluno existente e não INATIVO; plano ativo; uma única matrícula ATIVA por aluno.
     * Gera uma mensalidade por mês de duração do plano, com vencimento mensal a partir da data de início.
     */
    @Transactional
    public MatriculaResponse criar(MatriculaRequest r) {
        var aluno = alunos.buscar(r.alunoId()).orElseThrow(() -> ApiException.naoEncontrado("Aluno não encontrado"));
        if ("INATIVO".equals(aluno.status())) throw ApiException.regra("Aluno inativo não pode ser matriculado");
        var plano = planos.buscar(r.planoId()).orElseThrow(() -> ApiException.naoEncontrado("Plano não encontrado"));
        if (!plano.ativo()) throw ApiException.regra("Plano inativo");
        if (matriculas.existeAtiva(r.alunoId())) throw ApiException.conflito("O aluno já possui matrícula ativa");

        LocalDate fim = r.dataInicio().plusMonths(plano.duracaoMeses());
        long id = matriculas.inserir(r.alunoId(), r.planoId(), r.dataInicio(), fim, r.observacoes());
        for (int i = 0; i < plano.duracaoMeses(); i++) {
            LocalDate venc = r.dataInicio().plusMonths(i);
            mensalidades.inserirLote(id, venc.withDayOfMonth(1), plano.valorMensal(), venc);
        }
        return buscar(id);
    }

    /** Alteração contratual (status e observação). */
    @Transactional
    public MatriculaResponse alterar(long id, MatriculaAlteracaoRequest r) {
        if (matriculas.alterar(id, r.status(), r.observacoes()) == 0)
            throw ApiException.naoEncontrado("Matrícula não encontrada");
        return buscar(id);
    }
}
