package br.senai.g7.exception;

import br.senai.g7.dto.Dtos.ErroResponse;
import jakarta.validation.ConstraintViolationException;
import java.time.OffsetDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.dao.QueryTimeoutException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * Tratamento global de erros: converte exceções (validação, duplicidade, regra de negócio, timeout) em
 * respostas JSON padronizadas.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private ResponseEntity<ErroResponse> resp(HttpStatus s, String erro, List<String> det) {
        return ResponseEntity.status(s).body(new ErroResponse(OffsetDateTime.now(), s.value(), erro, det));
    }

    @ExceptionHandler(ApiException.class)
    public ResponseEntity<ErroResponse> api(ApiException e) { return resp(e.getStatus(), e.getMessage(), List.of()); }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErroResponse> validacao(MethodArgumentNotValidException e) {
        List<String> d = e.getBindingResult().getFieldErrors().stream()
                .map(f -> f.getField() + ": " + f.getDefaultMessage()).toList();
        return resp(HttpStatus.BAD_REQUEST, "Dados inválidos", d);
    }

    @ExceptionHandler({ConstraintViolationException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ErroResponse> requisicaoInvalida(Exception e) {
        return resp(HttpStatus.BAD_REQUEST, "Requisição inválida", List.of());
    }

    @ExceptionHandler(DuplicateKeyException.class)
    public ResponseEntity<ErroResponse> duplicado(DuplicateKeyException e) {
        return resp(HttpStatus.CONFLICT, "Registro duplicado (CPF, nome de plano ou competência já existente)", List.of());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ErroResponse> integridade(DataIntegrityViolationException e) {
        log.warn("Violação de integridade: {}", e.getMostSpecificCause().getMessage());
        return resp(HttpStatus.CONFLICT, "Operação viola uma regra de integridade do banco", List.of());
    }

    @ExceptionHandler(QueryTimeoutException.class)
    public ResponseEntity<ErroResponse> timeout(QueryTimeoutException e) {
        return resp(HttpStatus.GATEWAY_TIMEOUT, "A consulta excedeu o tempo limite (statement_timeout)", List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErroResponse> geral(Exception e) {
        log.error("Erro inesperado", e);
        return resp(HttpStatus.INTERNAL_SERVER_ERROR, "Erro interno do servidor", List.of());
    }
}
