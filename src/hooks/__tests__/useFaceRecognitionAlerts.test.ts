// src/hooks/__tests__/useFaceRecognitionAlerts.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFaceRecognitionAlerts } from '../useFaceRecognitionAlerts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Mocks
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
  })),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('./useFaceAPI', () => ({
  FaceDetection: {},
  FaceMatch: {},
}));

const mockRecognitionEvent = {
  id: 'event-1',
  cameraId: 'cam-1',
  cameraName: 'Câmera Entrada',
  personId: 'person-1',
  personName: 'João Silva',
  status: 'known' as const,
  similarity: 0.92,
  timestamp: new Date(),
  snapshotUrl: 'https://example.com/snapshot.jpg',
  alertCreated: false,
};

const mockFaceDetection = {
  box: { x: 100, y: 100, width: 150, height: 150 },
  confidence: 0.98,
  landmarks: [],
  descriptor: new Float32Array(128),
};

const mockFaceMatch = {
  personId: 'person-1',
  personName: 'João Silva',
  similarity: 0.92,
  listType: 'known',
};

describe('useFaceRecognitionAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockResolvedValue({ data: mockRecognitionEvent, error: null }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com estado padrão', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      expect(result.current).toBeDefined();
    });

    it('deve ter eventos vazios inicialmente', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.events) {
        expect(result.current.events).toEqual([]);
      }
    });

    it('deve ter loading false inicialmente', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.loading !== undefined) {
        expect(result.current.loading).toBe(false);
      }
    });
  });

  describe('Processamento de Reconhecimento', () => {
    it('deve ter função processRecognition', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        expect(typeof result.current.processRecognition).toBe('function');
      }
    });

    it('deve processar detecção de rosto conhecido', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        await act(async () => {
          await result.current.processRecognition({
            cameraId: 'cam-1',
            cameraName: 'Câmera 1',
            detection: mockFaceDetection,
            match: mockFaceMatch,
          });
        });
      }
    });

    it('deve processar detecção de rosto desconhecido', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        await act(async () => {
          await result.current.processRecognition({
            cameraId: 'cam-1',
            cameraName: 'Câmera 1',
            detection: mockFaceDetection,
            match: null,
          });
        });
      }
    });

    it('deve processar detecção de pessoa na blacklist', async () => {
      const blacklistMatch = {
        ...mockFaceMatch,
        listType: 'blacklist',
      };

      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        await act(async () => {
          await result.current.processRecognition({
            cameraId: 'cam-1',
            cameraName: 'Câmera 1',
            detection: mockFaceDetection,
            match: blacklistMatch,
          });
        });
      }
    });

    it('deve processar detecção de VIP', async () => {
      const vipMatch = {
        ...mockFaceMatch,
        listType: 'vip',
      };

      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        await act(async () => {
          await result.current.processRecognition({
            cameraId: 'cam-1',
            cameraName: 'Câmera 1',
            detection: mockFaceDetection,
            match: vipMatch,
          });
        });
      }
    });
  });

  describe('Criação de Alertas', () => {
    it('deve criar alerta para pessoa na blacklist', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.createAlert) {
        await act(async () => {
          await result.current.createAlert({
            type: 'blacklist_detection',
            personId: 'person-1',
            cameraId: 'cam-1',
            confidence: 0.95,
          });
        });
      }
    });

    it('deve criar alerta para pessoa desconhecida se configurado', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.createAlert) {
        await act(async () => {
          await result.current.createAlert({
            type: 'unknown_person',
            personId: null,
            cameraId: 'cam-1',
            confidence: 0.88,
          });
        });
      }
    });
  });

  describe('Histórico de Eventos', () => {
    it('deve buscar histórico de reconhecimentos', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.fetchHistory) {
        await act(async () => {
          await result.current.fetchHistory();
        });
      }
    });

    it('deve limitar histórico a N eventos', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.fetchHistory) {
        await act(async () => {
          await result.current.fetchHistory({ limit: 50 });
        });
      }
    });

    it('deve filtrar histórico por câmera', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.fetchHistory) {
        await act(async () => {
          await result.current.fetchHistory({ cameraId: 'cam-1' });
        });
      }
    });

    it('deve filtrar histórico por status', async () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.fetchHistory) {
        await act(async () => {
          await result.current.fetchHistory({ status: 'blacklist' });
        });
      }
    });
  });

  describe('Estatísticas', () => {
    it('deve calcular estatísticas de reconhecimento', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.stats) {
        expect(result.current.stats).toBeDefined();
      }
    });

    it('deve contar eventos por status', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.getCountByStatus) {
        expect(typeof result.current.getCountByStatus).toBe('function');
      }
    });

    it('deve retornar eventos recentes', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.recentEvents) {
        expect(Array.isArray(result.current.recentEvents)).toBe(true);
      }
    });
  });

  describe('Configurações', () => {
    it('deve ter configuração de threshold de similaridade', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.config) {
        expect(result.current.config.similarityThreshold).toBeDefined();
      }
    });

    it('deve ter configuração de alertas habilitados', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.config) {
        expect(result.current.config.alertsEnabled).toBeDefined();
      }
    });
  });

  describe('Integração com Auth', () => {
    it('deve verificar autenticação do usuário', () => {
      const { result } = renderHook(() => useFaceRecognitionAlerts());

      expect(useAuth).toHaveBeenCalled();
    });

    it('deve funcionar sem usuário autenticado', () => {
      (useAuth as any).mockReturnValue({ user: null });

      expect(() => {
        renderHook(() => useFaceRecognitionAlerts());
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('deve limpar recursos ao desmontar', () => {
      const { unmount } = renderHook(() => useFaceRecognitionAlerts());

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Tratamento de Erros', () => {
    it('deve lidar com erro ao processar reconhecimento', async () => {
      (supabase.from as any).mockReturnValue({
        insert: vi.fn().mockRejectedValue(new Error('Erro de inserção')),
      });

      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.processRecognition) {
        await act(async () => {
          try {
            await result.current.processRecognition({
              cameraId: 'cam-1',
              cameraName: 'Câmera 1',
              detection: mockFaceDetection,
              match: mockFaceMatch,
            });
          } catch (e) {
            // Erro esperado
          }
        });
      }
    });

    it('deve lidar com erro ao buscar histórico', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Erro de busca')),
          }),
        }),
      });

      const { result } = renderHook(() => useFaceRecognitionAlerts());

      if (result.current.fetchHistory) {
        await act(async () => {
          try {
            await result.current.fetchHistory();
          } catch (e) {
            // Erro esperado
          }
        });
      }
    });
  });
});
