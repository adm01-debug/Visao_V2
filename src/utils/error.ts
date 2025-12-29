/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Error Utilities - Classes e helpers de erro
 * 
 * @module utils/error
 */

// ============================================
// TIPOS
// ============================================

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NETWORK_ERROR'
  | 'AUTH_ERROR'
  | 'NOT_FOUND'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'SERVER_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

export interface ErrorDetails {
  field?: string;
  status?: number;
  [key: string]: unknown;
}

// ============================================
// CLASSES DE ERRO
// ============================================

/**
 * Erro base da aplicação
 */
export class AppError extends Error {
  public readonly timestamp: Date;
  
  constructor(
    public override message: string,
    public code: ErrorCode,
    public details?: ErrorDetails
  ) {
    super(message);
    this.name = 'AppError';
    this.timestamp = new Date();
    
    // Manter stack trace correta
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

/**
 * Erro de validação
 */
export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}

/**
 * Erro de rede
 */
export class NetworkError extends AppError {
  constructor(message: string, public status?: number) {
    super(message, 'NETWORK_ERROR', { status });
    this.name = 'NetworkError';
  }
}

/**
 * Erro de autenticação
 */
export class AuthError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

/**
 * Erro de recurso não encontrado
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} não encontrado`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

/**
 * Erro de acesso proibido
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Acesso negado') {
    super(message, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

/**
 * Erro de conflito
 */
export class ConflictError extends AppError {
  constructor(message = 'Conflito de dados') {
    super(message, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

/**
 * Erro de timeout
 */
export class TimeoutError extends AppError {
  constructor(message = 'Tempo limite excedido') {
    super(message, 'TIMEOUT');
    this.name = 'TimeoutError';
  }
}

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Verificar se é AppError
 */
export const isAppError = (error: unknown): error is AppError => {
  return error instanceof AppError;
};

/**
 * Verificar se é ValidationError
 */
export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError;
};

/**
 * Verificar se é NetworkError
 */
export const isNetworkError = (error: unknown): error is NetworkError => {
  return error instanceof NetworkError;
};

/**
 * Verificar se é AuthError
 */
export const isAuthError = (error: unknown): error is AuthError => {
  return error instanceof AuthError;
};

// ============================================
// HELPERS
// ============================================

/**
 * Extrair mensagem de erro de qualquer valor
 */
export const getErrorMessage = (error: unknown): string => {
  if (isAppError(error)) return error.message;
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Erro desconhecido';
};

/**
 * Extrair código de erro
 */
export const getErrorCode = (error: unknown): ErrorCode => {
  if (isAppError(error)) return error.code;
  return 'UNKNOWN';
};

/**
 * Wrapper try-catch assíncrono
 * @returns Tuple [resultado, erro]
 */
export const tryAsync = async <T>(
  fn: () => Promise<T>
): Promise<[T, null] | [null, Error]> => {
  try {
    const result = await fn();
    return [result, null];
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return [null, error];
  }
};

/**
 * Wrapper try-catch síncrono
 * @returns Tuple [resultado, erro]
 */
export const trySync = <T>(
  fn: () => T
): [T, null] | [null, Error] => {
  try {
    const result = fn();
    return [result, null];
  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    return [null, error];
  }
};

/**
 * Criar erro a partir de resposta HTTP
 */
export const fromHttpStatus = (status: number, message?: string): AppError => {
  const defaultMessages: Record<number, string> = {
    400: 'Requisição inválida',
    401: 'Não autorizado',
    403: 'Acesso negado',
    404: 'Não encontrado',
    409: 'Conflito',
    429: 'Muitas requisições',
    500: 'Erro interno do servidor',
    502: 'Gateway inválido',
    503: 'Serviço indisponível',
    504: 'Timeout do gateway',
  };
  
  const errorMessage = message || defaultMessages[status] || 'Erro desconhecido';
  
  switch (status) {
    case 401:
      return new AuthError(errorMessage);
    case 403:
      return new ForbiddenError(errorMessage);
    case 404:
      return new NotFoundError(errorMessage);
    case 409:
      return new ConflictError(errorMessage);
    default:
      return new NetworkError(errorMessage, status);
  }
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  AppError,
  ValidationError,
  NetworkError,
  AuthError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  TimeoutError,
  isAppError,
  isValidationError,
  isNetworkError,
  isAuthError,
  getErrorMessage,
  getErrorCode,
  tryAsync,
  trySync,
  fromHttpStatus,
};
