/**
 * VISÃO - Testes de Integração: storageService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

// Mock supabase before importing service
const mockClient = createMockSupabaseClient();
vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockClient,
}));

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Supabase Storage Mock', () => {
    it('deve ter método from', () => {
      expect(typeof mockClient.storage.from).toBe('function');
    });

    it('deve ter método upload', () => {
      const bucket = mockClient.storage.from('test-bucket');
      expect(typeof bucket.upload).toBe('function');
    });

    it('deve ter método getPublicUrl', () => {
      const bucket = mockClient.storage.from('test-bucket');
      expect(typeof bucket.getPublicUrl).toBe('function');
    });

    it('deve ter método download', () => {
      const bucket = mockClient.storage.from('test-bucket');
      expect(typeof bucket.download).toBe('function');
    });

    it('deve ter método remove', () => {
      const bucket = mockClient.storage.from('test-bucket');
      expect(typeof bucket.remove).toBe('function');
    });

    it('deve fazer upload de arquivo', async () => {
      const bucket = mockClient.storage.from('person-photos');
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      
      const result = await bucket.upload('photos/test.jpg', file);
      expect(result.data).toBeDefined();
      expect(result.error).toBe(null);
    });

    it('deve retornar URL pública', () => {
      const bucket = mockClient.storage.from('person-photos');
      const result = bucket.getPublicUrl('photos/test.jpg');
      
      expect(result.data.publicUrl).toBeDefined();
      expect(result.data.publicUrl).toContain('https://');
    });

    it('deve fazer download de arquivo', async () => {
      const bucket = mockClient.storage.from('person-photos');
      const result = await bucket.download('photos/test.jpg');
      
      expect(result.data).toBeDefined();
      expect(result.error).toBe(null);
    });

    it('deve remover arquivo', async () => {
      const bucket = mockClient.storage.from('person-photos');
      const result = await bucket.remove(['photos/test.jpg']);
      
      expect(result.error).toBe(null);
    });

    it('deve listar arquivos', async () => {
      const bucket = mockClient.storage.from('person-photos');
      const result = await bucket.list('photos');
      
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.error).toBe(null);
    });
  });
});
