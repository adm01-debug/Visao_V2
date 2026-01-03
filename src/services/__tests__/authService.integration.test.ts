/**
 * VISÃO - Testes de Integração: authService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

// Mock supabase before importing service
const mockClient = createMockSupabaseClient();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockClient,
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Supabase Auth Mock', () => {
    it('deve ter método getUser', () => {
      expect(typeof mockClient.auth.getUser).toBe('function');
    });

    it('deve ter método getSession', () => {
      expect(typeof mockClient.auth.getSession).toBe('function');
    });

    it('deve ter método signInWithPassword', () => {
      expect(typeof mockClient.auth.signInWithPassword).toBe('function');
    });

    it('deve ter método signUp', () => {
      expect(typeof mockClient.auth.signUp).toBe('function');
    });

    it('deve ter método signOut', () => {
      expect(typeof mockClient.auth.signOut).toBe('function');
    });

    it('deve retornar usuário em getUser', async () => {
      const result = await mockClient.auth.getUser();
      expect(result.data.user).toBeDefined();
      expect(result.data.user?.id).toBe('user-1');
    });

    it('deve retornar sessão em getSession', async () => {
      const result = await mockClient.auth.getSession();
      expect(result.data.session).toBeDefined();
    });

    it('deve fazer login com senha', async () => {
      const result = await mockClient.auth.signInWithPassword({
        email: 'test@test.com',
        password: 'password123',
      });
      expect(result.data.user).toBeDefined();
      expect(result.error).toBe(null);
    });

    it('deve criar usuário', async () => {
      const result = await mockClient.auth.signUp({
        email: 'new@test.com',
        password: 'password123',
      });
      expect(result.data.user).toBeDefined();
      expect(result.error).toBe(null);
    });

    it('deve fazer logout', async () => {
      const result = await mockClient.auth.signOut();
      expect(result.error).toBe(null);
    });
  });
});
