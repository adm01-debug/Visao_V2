/**
 * VISÃO - Testes de Integração: alertsService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient } from '@/test/mocks/supabase';

// Mock supabase before importing service
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { alertsService } from '@/services/alertsService';

describe('alertsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('deve retornar lista de alertas', async () => {
      const alerts = await alertsService.getAll();
      expect(alerts).toBeDefined();
      expect(Array.isArray(alerts)).toBe(true);
    });

    it('deve aplicar filtros corretamente', async () => {
      const filters = {
        severity: 'high' as const,
        read: false,
      };
      const alerts = await alertsService.getAll(filters);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  describe('getById', () => {
    it('deve retornar alerta por ID', async () => {
      const alert = await alertsService.getById('alert-1');
      expect(alert).toBeDefined();
    });
  });

  describe('create', () => {
    it('deve criar novo alerta', async () => {
      const newAlert = {
        type: 'motion' as const,
        severity: 'high' as const,
        title: 'Novo Alerta',
        description: 'Descrição do alerta',
      };
      
      const created = await alertsService.create(newAlert);
      expect(created).toBeDefined();
    });
  });

  describe('update', () => {
    it('deve atualizar alerta existente', async () => {
      const updated = await alertsService.update('alert-1', { 
        read: true 
      });
      expect(updated).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deve deletar alerta', async () => {
      await expect(alertsService.delete('alert-1')).resolves.not.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('deve marcar alerta como lido', async () => {
      const updated = await alertsService.markAsRead('alert-1');
      expect(updated).toBeDefined();
    });
  });

  describe('markMultipleAsRead', () => {
    it('deve marcar múltiplos alertas como lidos', async () => {
      await expect(
        alertsService.markMultipleAsRead(['alert-1', 'alert-2'])
      ).resolves.not.toThrow();
    });
  });

  describe('acknowledge', () => {
    it('deve reconhecer alerta', async () => {
      const acknowledged = await alertsService.acknowledge('alert-1', 'user-1');
      expect(acknowledged).toBeDefined();
    });
  });

  describe('resolve', () => {
    it('deve resolver alerta', async () => {
      const resolved = await alertsService.resolve('alert-1', 'user-1');
      expect(resolved).toBeDefined();
    });
  });

  describe('dismiss', () => {
    it('deve dispensar alerta', async () => {
      const dismissed = await alertsService.dismiss('alert-1');
      expect(dismissed).toBeDefined();
    });
  });

  describe('getUnreadCount', () => {
    it('deve retornar contagem de não lidos', async () => {
      const count = await alertsService.getUnreadCount();
      expect(typeof count).toBe('number');
    });
  });

  describe('countBySeverity', () => {
    it('deve contar alertas por severidade', async () => {
      const counts = await alertsService.countBySeverity();
      expect(counts).toBeDefined();
      expect(typeof counts.critical).toBe('number');
      expect(typeof counts.high).toBe('number');
    });
  });

  describe('getRecent', () => {
    it('deve retornar alertas recentes', async () => {
      const recent = await alertsService.getRecent(5);
      expect(Array.isArray(recent)).toBe(true);
    });
  });
});
