package br.senai.g7.exception;

import org.springframework.http.HttpStatus;

/**
 * Exceção de negócio com status HTTP associado; é traduzida em resposta JSON pelo
 * GlobalExceptionHandler.
 */
public class ApiException extends RuntimeException {
    private final HttpStatus status;
    public ApiException(HttpStatus status, String message) { super(message); this.status = status; }
    public HttpStatus getStatus() { return status; }
    public static ApiException naoEncontrado(String msg) { return new ApiException(HttpStatus.NOT_FOUND, msg); }
    public static ApiException conflito(String msg) { return new ApiException(HttpStatus.CONFLICT, msg); }
    public static ApiException regra(String msg) { return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, msg); }
}
