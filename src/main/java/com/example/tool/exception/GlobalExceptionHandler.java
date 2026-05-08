package com.example.tool.exception;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.Map;
import java.util.stream.Collectors;

@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    // 404 - Resource not found
    @ExceptionHandler({ResourceNotFoundException.class, ComplianceNotFoundException.class})
    public ResponseEntity<ErrorResponse> handleNotFound(RuntimeException ex, HttpServletRequest request) {
        log.warn("Resource not found: {} | path: {}", ex.getMessage(), sanitize(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                ErrorResponse.of(404, "Not Found", ex.getMessage(), request.getRequestURI())
        );
    }

    // 400 - Custom validation (service layer)
    @ExceptionHandler(InvalidDataException.class)
    public ResponseEntity<ErrorResponse> handleInvalidData(InvalidDataException ex, HttpServletRequest request) {
        log.warn("Invalid data: {} | path: {}", ex.getMessage(), sanitize(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.of(400, "Bad Request", ex.getMessage(), request.getRequestURI())
        );
    }

    // 400 - Bean validation (@Valid field errors)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors()
                .stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "Invalid value",
                        (existing, replacement) -> existing
                ));
        log.warn("Validation failed: {} | path: {}", fieldErrors, sanitize(request.getRequestURI()));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                ErrorResponse.ofValidation(400, "Bad Request", "Validation failed", request.getRequestURI(), fieldErrors)
        );
    }

    // 500 - Catch-all
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        ex.printStackTrace();
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred: " + ex.getMessage());
    }

    private String sanitize(String value) {
        return value == null ? "" : value.replaceAll("[\r\n]", "_");
    }
}
