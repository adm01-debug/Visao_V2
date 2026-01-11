/**
 * Safe execution wrapper for error handling in hooks and utilities
 * Catches errors gracefully and logs them only in development
 */

/**
 * Executes a function safely, catching any errors
 * @param fn - Function to execute
 * @param fallback - Fallback value if function throws
 * @param context - Context name for error logging
 * @returns Result of function or fallback value
 */
export function safeExecute<T>(
  fn: () => T,
  fallback: T,
  context?: string
): T {
  try {
    return fn();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[${context || 'safeExecute'}] Error:`, error);
    }
    return fallback;
  }
}

/**
 * Executes an async function safely
 * @param fn - Async function to execute
 * @param fallback - Fallback value if function throws
 * @param context - Context name for error logging
 * @returns Promise with result or fallback value
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`[${context || 'safeExecuteAsync'}] Error:`, error);
    }
    return fallback;
  }
}

/**
 * Creates a safe callback wrapper
 * @param callback - Callback to wrap
 * @param context - Context name for error logging
 * @returns Wrapped callback that catches errors
 */
export function createSafeCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  context?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      return callback(...args);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error(`[${context || 'callback'}] Error:`, error);
      }
    }
  }) as T;
}

export default safeExecute;
