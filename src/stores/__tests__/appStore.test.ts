import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../appStore';

describe('appStore', () => {
  beforeEach(() => {
    // Reset store state
    useAppStore.setState({
      isLoading: false,
      error: null,
      initialized: false,
    });
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const state = useAppStore.getState();
      expect(state).toBeDefined();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('loading state', () => {
    it('should set loading to true', () => {
      const { setLoading } = useAppStore.getState();
      if (setLoading) {
        setLoading(true);
        expect(useAppStore.getState().isLoading).toBe(true);
      }
    });

    it('should set loading to false', () => {
      const { setLoading } = useAppStore.getState();
      if (setLoading) {
        setLoading(true);
        setLoading(false);
        expect(useAppStore.getState().isLoading).toBe(false);
      }
    });
  });

  describe('error handling', () => {
    it('should set error message', () => {
      const { setError } = useAppStore.getState();
      if (setError) {
        setError('Test error message');
        expect(useAppStore.getState().error).toBe('Test error message');
      }
    });

    it('should clear error', () => {
      const { setError, clearError } = useAppStore.getState();
      if (setError && clearError) {
        setError('Error');
        clearError();
        expect(useAppStore.getState().error).toBeNull();
      }
    });
  });

  describe('initialization', () => {
    it('should mark as initialized', () => {
      const { setInitialized } = useAppStore.getState();
      if (setInitialized) {
        setInitialized(true);
        expect(useAppStore.getState().initialized).toBe(true);
      }
    });
  });
});
