export class AppError extends Error {
  constructor(public message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', { field });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends AppError {
  constructor(message: string, public status?: number) {
    super(message, 'NETWORK_ERROR', { status });
    this.name = 'NetworkError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Não autorizado') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthError';
  }
}

export const isAppError = (error: unknown): error is AppError => error instanceof AppError;
export const getErrorMessage = (error: unknown): string => {
  if (isAppError(error)) return error.message;
  if (error instanceof Error) return error.message;
  return String(error);
};

export const tryAsync = async <T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> => {
  try { return [await fn(), null]; }
  catch (e) { return [null, e instanceof Error ? e : new Error(String(e))]; }
};
