package br.senai.g7.service;

import br.senai.g7.dto.Dtos.*;
import br.senai.g7.exception.ApiException;
import br.senai.g7.repository.PlanoRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Regras de planos: consulta, criação e atualização.
 */
@Service
public class PlanoService {
    private final PlanoRepository planos;
    public PlanoService(PlanoRepository planos) { this.planos = planos; }

    public List<PlanoResponse> listar(boolean apenasAtivos) { return planos.listar(apenasAtivos); }

    public PlanoResponse buscar(long id) {
        return planos.buscar(id).orElseThrow(() -> ApiException.naoEncontrado("Plano não encontrado"));
    }

    @Transactional
    public PlanoResponse criar(PlanoRequest r) { return buscar(planos.inserir(r)); }

    @Transactional
    public PlanoResponse atualizar(long id, PlanoRequest r) {
        if (planos.atualizar(id, r) == 0) throw ApiException.naoEncontrado("Plano não encontrado");
        return buscar(id);
    }
}
