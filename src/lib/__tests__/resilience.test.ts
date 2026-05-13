import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CircuitBreaker, getCircuitBreaker, withCircuitBreaker } from '../resilience';

describe('CircuitBreaker', () => {
  const config = {
    name: 'test-breaker',
    failureThreshold: 2,
    cooldownPeriod: 100, // 100ms para teste rápido
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('deve iniciar no estado CLOSED', () => {
    const breaker = new CircuitBreaker(config);
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('deve executar funções com sucesso e permanecer CLOSED', async () => {
    const breaker = new CircuitBreaker(config);
    const mockFn = vi.fn().mockResolvedValue('success');
    
    const result = await breaker.execute(mockFn);
    
    expect(result).toBe('success');
    expect(breaker.getState()).toBe('CLOSED');
  });

  it('deve abrir o circuito após atingir o limite de falhas', async () => {
    const breaker = new CircuitBreaker(config);
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Primeira falha
    await expect(breaker.execute(mockFn)).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('CLOSED');
    
    // Segunda falha (atinge o limite)
    await expect(breaker.execute(mockFn)).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('OPEN');
  });

  it('deve impedir execuções quando estiver OPEN', async () => {
    const breaker = new CircuitBreaker(config);
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Abre o circuito
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    expect(breaker.getState()).toBe('OPEN');
    
    const anotherFn = vi.fn().mockResolvedValue('wont-run');
    await expect(breaker.execute(anotherFn)).rejects.toThrow(/is OPEN/);
    expect(anotherFn).not.toHaveBeenCalled();
  });

  it('deve transitar para HALF_OPEN após o período de cooldown', async () => {
    const breaker = new CircuitBreaker(config);
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Abre
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    
    // Espera o cooldown
    vi.advanceTimersByTime(150);
    
    // Próxima chamada deve ser HALF_OPEN
    const successFn = vi.fn().mockResolvedValue('recovered');
    const result = await breaker.execute(successFn);
    
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe('CLOSED'); // Volta para CLOSED após sucesso em HALF_OPEN
  });

  it('deve voltar para OPEN se falhar em HALF_OPEN', async () => {
    const breaker = new CircuitBreaker(config);
    const mockFn = vi.fn().mockRejectedValue(new Error('fail'));
    
    // Abre
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    await expect(breaker.execute(mockFn)).rejects.toThrow();
    
    vi.advanceTimersByTime(150);
    
    // Falha em HALF_OPEN volta para OPEN imediatamente
    await expect(breaker.execute(mockFn)).rejects.toThrow('fail');
    expect(breaker.getState()).toBe('OPEN');
  });
});

describe('Circuit Breaker Helpers', () => {
  it('getCircuitBreaker deve retornar uma instância persistente', () => {
    const b1 = getCircuitBreaker('shared');
    const b2 = getCircuitBreaker('shared');
    expect(b1).toBe(b2);
  });

  it('withCircuitBreaker deve executar a função corretamente', async () => {
    const result = await withCircuitBreaker('helper-test', async () => 'ok');
    expect(result).toBe('ok');
  });
});
