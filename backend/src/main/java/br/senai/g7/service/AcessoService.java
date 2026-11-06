package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.AcessoRepository;
import br.senai.g7.repository.AlunoRepository;
import br.senai.g7.security.AuthUser;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registra o acesso do aluno delegando a decisão à Function do banco e devolvendo o resultado ao
 * operador.
 */
@Service
public class AcessoService {
    private final AcessoRepository acessos;
    private final AlunoRepository alunos;

    public AcessoService(AcessoRepository acessos, AlunoRepository alunos) {
        this.acessos = acessos; this.alunos = alunos;
    }

    /** A decisão (liberar/bloquear) é tomada pela Function app.fn_verificar_acesso no PostgreSQL. */
    @Transactional
    public AcessoResponse registrar(AcessoRequest r, AuthUser operador) {
        alunos.buscar(r.alunoId()).orElseThrow(() -> ApiException.naoEncontrado("Aluno não encontrado"));
        return acessos.registrar(r.alunoId(), operador.id());
    }

    public List<AcessoResponse> listar(Long alunoId, String resultado, int limite) {
        return acessos.listar(alunoId, resultado, Math.min(Math.max(limite, 1), 500));
    }
}
