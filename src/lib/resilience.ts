import { logger } from './logger';

/**
 * Configuração do Circuit Breaker
 */
export interface CircuitBreakerConfig {
  /** Número de falhas antes de abrir o circuito */
  failureThreshold: number;
  /** Tempo (ms) para manter o circuito aberto antes de tentar novamente */
  cooldownPeriod: number;
  /** Nome da operação para logs */
  name: string;
}

/**
 * Estados do Circuito
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * VISÃO - Circuit Breaker Pattern
 * 
 * Protege o sistema contra falhas em cascata em integrações externas (IA, Telegram, etc).
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private lastFailureTime?: number;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - (this.lastFailureTime || 0) > this.config.cooldownPeriod) {
        this.state = 'HALF_OPEN';
        logger.warn(`Circuit Breaker [${this.config.name}] transitioning to HALF_OPEN`);
      } else {
        throw new Error(`Circuit Breaker [${this.config.name}] is OPEN. Operation aborted.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`Circuit Breaker [${this.config.name}] is now CLOSED`);
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold || this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
      logger.error(`Circuit Breaker [${this.config.name}] is now OPEN due to consecutive failures`);
    }
  }

  getState(): CircuitState {
    return this.state;
  }
}

// Registro global de instâncias para reuso
const breakers = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
  if (!breakers.has(name)) {
    breakers.set(name, new CircuitBreaker({
      name,
      failureThreshold: config?.failureThreshold || 5,
      cooldownPeriod: config?.cooldownPeriod || 60000, // 1 min default
    }));
  }
  return breakers.get(name)!;
}

/**
 * HOF para facilitar o uso do Circuit Breaker
 */
export function withCircuitBreaker<T>(
  name: string, 
  fn: () => Promise<T>, 
  config?: Partial<CircuitBreakerConfig>
): Promise<T> {
  const breaker = getCircuitBreaker(name, config);
  return breaker.execute(fn);
}
