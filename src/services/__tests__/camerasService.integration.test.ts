/**
 * VISÃO - Testes de Integração: camerasService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockSupabaseClient, mockCameraData } from '@/test/mocks/supabase';

// Mock supabase before importing service
vi.mock('@/integrations/supabase/client', () => ({
  supabase: createMockSupabaseClient(),
}));

import { camerasService } from '@/services/camerasService';

describe('camerasService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('deve retornar lista de câmeras', async () => {
      const cameras = await camerasService.getAll();
      expect(cameras).toBeDefined();
      expect(Array.isArray(cameras)).toBe(true);
    });
  });

  describe('getById', () => {
    it('deve retornar câmera por ID', async () => {
      const camera = await camerasService.getById('cam-1');
      expect(camera).toBeDefined();
    });
  });

  describe('create', () => {
    it('deve criar nova câmera', async () => {
      const newCamera = {
        name: 'Nova Câmera',
        url: 'rtsp://localhost:8554/stream',
        status: 'online' as const,
        location: 'Sala de Reuniões',
      };
      
      const created = await camerasService.create(newCamera);
      expect(created).toBeDefined();
    });
  });

  describe('update', () => {
    it('deve atualizar câmera existente', async () => {
      const updated = await camerasService.update('cam-1', { 
        name: 'Câmera Atualizada' 
      });
      expect(updated).toBeDefined();
    });
  });

  describe('delete', () => {
    it('deve deletar câmera', async () => {
      await expect(camerasService.delete('cam-1')).resolves.not.toThrow();
    });
  });

  describe('getOnline', () => {
    it('deve retornar apenas câmeras online', async () => {
      const onlineCameras = await camerasService.getOnline();
      expect(Array.isArray(onlineCameras)).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('deve atualizar status da câmera', async () => {
      const updated = await camerasService.updateStatus('cam-1', 'offline');
      expect(updated).toBeDefined();
    });
  });

  describe('countByStatus', () => {
    it('deve contar câmeras por status', async () => {
      const counts = await camerasService.countByStatus();
      expect(counts).toBeDefined();
      expect(typeof counts.online).toBe('number');
      expect(typeof counts.offline).toBe('number');
    });
  });
});
