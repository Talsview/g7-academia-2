package br.senai.g7.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/** Todos os DTOs da API (records imutáveis). */
public final class Dtos {
    private Dtos() {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String senha) {}
    public record LoginResponse(String token, String nome, String email, String perfil) {}

    public record AlunoRequest(
            @NotBlank @Size(max = 150) String nome,
            @NotBlank @Pattern(regexp = "\\d{11}", message = "CPF deve ter 11 dígitos numéricos") String cpf,
            @NotNull @Past LocalDate dataNascimento,
            @Size(max = 20) String telefone,
            @Email @Size(max = 160) String email) {}
    public record AlunoResponse(Long id, String nome, String cpf, LocalDate dataNascimento, String telefone,
                                String email, LocalDate dataCadastro, String status) {}
    public record SituacaoFinanceiraResponse(Long alunoId, String nome, String situacaoCadastral, long qtdPendentes,
                                             long qtdAtrasadas, BigDecimal totalEmAberto, boolean inadimplente) {}

    public record PlanoRequest(
            @NotBlank @Size(max = 60) String nome,
            @Size(max = 255) String descricao,
            @NotNull @DecimalMin("0.01") BigDecimal valorMensal,
            @NotNull @Min(1) Integer duracaoMeses,
            Boolean ativo) {}
    public record PlanoResponse(Long id, String nome, String descricao, BigDecimal valorMensal, Integer duracaoMeses,
                                boolean ativo, LocalDate dataCadastro) {}

    public record MatriculaRequest(@NotNull Long alunoId, @NotNull Long planoId, @NotNull LocalDate dataInicio,
                                   @Size(max = 255) String observacoes) {}
    public record MatriculaAlteracaoRequest(@NotBlank @Pattern(regexp = "ATIVA|CANCELADA|ENCERRADA") String status,
                                            @Size(max = 255) String observacoes) {}
    public record MatriculaResponse(Long id, Long alunoId, String aluno, Long planoId, String plano,
                                    LocalDate dataInicio, LocalDate dataVencimento, String status, String observacoes) {}

    public record MensalidadeRequest(@NotNull Long matriculaId, @NotNull LocalDate competencia,
                                     @NotNull @DecimalMin("0.01") BigDecimal valor, @NotNull LocalDate dataVencimento) {}
    public record MensalidadeResponse(Long id, Long alunoId, String aluno, String plano, LocalDate competencia,
                                      BigDecimal valor, LocalDate dataVencimento, LocalDate dataPagamento,
                                      BigDecimal valorPago, String formaPagamento, String status, int diasAtraso) {}
    public record PagamentoRequest(@NotNull @DecimalMin("0.01") BigDecimal valorPago,
                                   @NotBlank @Pattern(regexp = "PIX|DINHEIRO|CARTAO|BOLETO") String formaPagamento,
                                   LocalDate dataPagamento) {}
    public record VencimentoRequest(@NotNull LocalDate novoVencimento, @Size(max = 255) String justificativa) {}

    public record AcessoRequest(@NotNull Long alunoId) {}
    public record AcessoResponse(Long id, Long alunoId, String aluno, OffsetDateTime dataHora, String resultado,
                                 String motivoBloqueio) {}

    public record DashboardResponse(long alunosAtivos, long alunosBloqueados, long mensalidadesPendentes,
                                    long mensalidadesAtrasadas, BigDecimal recebimentosMes,
                                    List<AcessoResponse> acessosRecentes) {}
    public record FaturamentoResponse(LocalDate mesReferencia, long quantidadePagamentos, BigDecimal totalRecebido,
                                      BigDecimal valorTotalArrecadado) {}
    public record AuditoriaVencimentoResponse(Long id, Long mensalidadeId, LocalDate vencimentoAnterior,
                                              LocalDate vencimentoNovo, OffsetDateTime alteradoEm,
                                              String usuarioResponsavel, String justificativa) {}
    public record InadimplenciaResponse(int bloqueados, int desbloqueados) {}
    public record ErroResponse(OffsetDateTime timestamp, int status, String erro, List<String> detalhes) {}
}
