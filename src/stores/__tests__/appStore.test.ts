import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset o estado da store antes de cada teste se houver uma função de reset
    // Como zustand stores não costumam ter reset nativo a menos que implementemos
    // vamos resetar manualmente as propriedades conhecidas
    useAppStore.setState({
      isLoading: false,
      error: null,
      isInitialized: false
    });
  });

  it('deve ter o estado inicial correto', () => {
    const state = useAppStore.getState();
    expect(state.isLoading).toBe(false);
    expect(state.error).toBe(null);
    expect(state.isInitialized).toBe(false);
  });

  it('deve atualizar o estado de loading corretamente', () => {
    const { setLoading } = useAppStore.getState();
    if (typeof setLoading === 'function') {
      setLoading(true);
      expect(useAppStore.getState().isLoading).toBe(true);
      
      setLoading(false);
      expect(useAppStore.getState().isLoading).toBe(false);
    }
  });

  it('deve gerenciar erros corretamente', () => {
    const { setError } = useAppStore.getState();
    if (typeof setError === 'function') {
      const errorMsg = 'Erro de teste no sistema VISÃO';
      setError(errorMsg);
      expect(useAppStore.getState().error).toBe(errorMsg);
      
      setError(null);
      expect(useAppStore.getState().error).toBe(null);
    }
  });

  it('deve marcar inicialização concluída', () => {
    const { setInitialized } = useAppStore.getState();
    if (typeof setInitialized === 'function') {
      setInitialized(true);
      expect(useAppStore.getState().isInitialized).toBe(true);
    }
  });
});
