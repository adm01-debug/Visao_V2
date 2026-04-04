import { logger } from './logger';

/**
 * Error Handler utilities
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN_ERROR",
    public statusCode: number = 500
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  return new AppError("An unknown error occurred");
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function logError(error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error('errorHandler', '[Error]:', msg);
}

export default { AppError, handleError, isAppError, logError };
