/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Utility: circuit-breaker
 * 
 * Implementação do pattern Circuit Breaker para resiliência
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerOptions {
  failureThreshold?: number;
  successThreshold?: number;
  timeout?: number; // ms para tentar reabrir
  volumeThreshold?: number; // mínimo de chamadas antes de abrir
  errorFilter?: (error: Error) => boolean;
  onStateChange?: (from: CircuitState, to: CircuitState) => void;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalCalls: number;
  lastFailure?: Date;
  lastSuccess?: Date;
}

export class CircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>> {
  private state: CircuitState = 'closed';
  private failures = 0;
  private successes = 0;
  private totalCalls = 0;
  private lastFailure?: Date;
  private lastSuccess?: Date;
  private nextAttempt?: Date;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(
    private readonly fn: T,
    options: CircuitBreakerOptions = {}
  ) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 5,
      successThreshold: options.successThreshold ?? 2,
      timeout: options.timeout ?? 30000,
      volumeThreshold: options.volumeThreshold ?? 10,
      errorFilter: options.errorFilter ?? (() => true),
      onStateChange: options.onStateChange ?? (() => {}),
      onSuccess: options.onSuccess ?? (() => {}),
      onFailure: options.onFailure ?? (() => {}),
    };
  }

  async execute(...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
    if (this.state === 'open') {
      if (this.shouldAttemptReset()) {
        this.transitionTo('half-open');
      } else {
        throw new CircuitOpenError('Circuito está aberto');
      }
    }

    this.totalCalls++;

    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result as Awaited<ReturnType<T>>;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.lastSuccess = new Date();
    this.successes++;
    this.options.onSuccess();

    if (this.state === 'half-open') {
      if (this.successes >= this.options.successThreshold) {
        this.transitionTo('closed');
      }
    } else {
      this.failures = 0;
    }
  }

  private onFailure(error: Error): void {
    if (!this.options.errorFilter(error)) {
      return;
    }

    this.lastFailure = new Date();
    this.failures++;
    this.options.onFailure(error);

    if (this.state === 'half-open') {
      this.transitionTo('open');
    } else if (
      this.totalCalls >= this.options.volumeThreshold &&
      this.failures >= this.options.failureThreshold
    ) {
      this.transitionTo('open');
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.nextAttempt) return true;
    return Date.now() >= this.nextAttempt.getTime();
  }

  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;

    if (newState === 'open') {
      this.nextAttempt = new Date(Date.now() + this.options.timeout);
      this.successes = 0;
    } else if (newState === 'closed') {
      this.failures = 0;
      this.successes = 0;
      this.nextAttempt = undefined;
    } else if (newState === 'half-open') {
      this.successes = 0;
    }

    this.options.onStateChange(oldState, newState);
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalCalls: this.totalCalls,
      lastFailure: this.lastFailure,
      lastSuccess: this.lastSuccess,
    };
  }

  reset(): void {
    this.state = 'closed';
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.lastFailure = undefined;
    this.lastSuccess = undefined;
    this.nextAttempt = undefined;
  }

  forceOpen(): void {
    this.transitionTo('open');
  }

  forceClose(): void {
    this.transitionTo('closed');
  }
}

export class CircuitOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

/**
 * Cria circuit breaker para função
 */
export function withCircuitBreaker<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  options?: CircuitBreakerOptions
): CircuitBreaker<T> {
  return new CircuitBreaker(fn, options);
}

/**
 * Decorator para circuit breaker
 */
export function circuitBreaker(options?: CircuitBreakerOptions) {
  return function <T extends (...args: unknown[]) => Promise<unknown>>(
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value as T;
    const breaker = new CircuitBreaker(originalMethod, options);

    descriptor.value = function (...args: Parameters<T>) {
      return breaker.execute(...args);
    };

    return descriptor;
  };
}

export default CircuitBreaker;
