/**
 * Safe execution wrapper
 */
export async function safeExecute<T>(
  fn: () => T | Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

export default safeExecute;
