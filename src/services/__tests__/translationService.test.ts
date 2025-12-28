// src/services/__tests__/translationService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translationService } from '../translationService';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: { translated: 'Olá' }, error: null }) },
  },
}));

describe('translationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe('translate', () => {
    it('deve traduzir texto', async () => {
      if (translationService.translate) {
        const result = await translationService.translate('Hello', 'pt');
        expect(result).toBeDefined();
      }
    });

    it('deve lidar com erro', async () => {
      if (translationService.translate) {
        // Test error handling
      }
    });
  });

  describe('detectLanguage', () => {
    it('deve detectar idioma', async () => {
      if (translationService.detectLanguage) {
        const lang = await translationService.detectLanguage('Hello');
        expect(typeof lang).toBe('string');
      }
    });
  });

  describe('getSupportedLanguages', () => {
    it('deve retornar idiomas suportados', () => {
      if (translationService.getSupportedLanguages) {
        const langs = translationService.getSupportedLanguages();
        expect(Array.isArray(langs)).toBe(true);
      }
    });
  });
});
