/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useStorage
 * 
 * Hook reutilizável para gerenciar uploads de arquivos
 * para qualquer bucket do Supabase Storage.
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TIPOS
// ============================================

export interface UploadOptions {
  /** Nome do bucket de destino */
  bucket: string;
  /** Subpasta dentro do bucket (opcional, padrão: user_id) */
  folder?: string;
  /** Tamanho máximo do arquivo em bytes (padrão: 5MB) */
  maxSize?: number;
  /** Tipos MIME permitidos (padrão: imagens) */
  allowedTypes?: string[];
  /** Tempo de cache em segundos (padrão: 3600) */
  cacheControl?: string;
  /** Sobrescrever arquivo existente (padrão: false) */
  upsert?: boolean;
  /** Nome do arquivo personalizado (sem extensão) */
  customFileName?: string;
}

export interface UploadResult {
  /** URL pública do arquivo */
  url: string;
  /** Caminho do arquivo no bucket */
  path: string;
  /** Nome do arquivo */
  fileName: string;
}

export interface UseStorageReturn {
  /** Estado de upload em andamento */
  isUploading: boolean;
  /** Progresso do upload (0-100) */
  progress: number;
  /** Erro do último upload */
  error: string | null;
  /** Faz upload de um arquivo */
  upload: (file: File, options: UploadOptions) => Promise<UploadResult | null>;
  /** Exclui um arquivo */
  remove: (bucket: string, path: string) => Promise<boolean>;
  /** Exclui múltiplos arquivos */
  removeMultiple: (bucket: string, paths: string[]) => Promise<boolean>;
  /** Obtém URL pública de um arquivo */
  getPublicUrl: (bucket: string, path: string) => string;
  /** Extrai o path do arquivo a partir da URL pública */
  extractPathFromUrl: (bucket: string, url: string) => string | null;
  /** Valida um arquivo antes do upload */
  validateFile: (file: File, options?: Partial<UploadOptions>) => { valid: boolean; error?: string };
  /** Limpa o estado de erro */
  clearError: () => void;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DEFAULT_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const DEFAULT_CACHE_CONTROL = '3600';

// ============================================
// HOOK
// ============================================

export function useStorage(): UseStorageReturn {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Valida um arquivo antes do upload
   */
  const validateFile = useCallback((
    file: File,
    options?: Partial<UploadOptions>
  ): { valid: boolean; error?: string } => {
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE;
    const allowedTypes = options?.allowedTypes ?? DEFAULT_ALLOWED_TYPES;

    // Verificar tamanho
    if (file.size > maxSize) {
      const maxSizeMB = Math.round(maxSize / (1024 * 1024));
      return {
        valid: false,
        error: `Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`,
      };
    }

    // Verificar tipo
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      const formattedTypes = allowedTypes
        .map(t => t.split('/')[1]?.toUpperCase())
        .filter(Boolean)
        .join(', ');
      return {
        valid: false,
        error: `Tipo de arquivo não permitido. Use: ${formattedTypes}`,
      };
    }

    return { valid: true };
  }, []);

  /**
   * Faz upload de um arquivo para o Storage
   */
  const upload = useCallback(async (
    file: File,
    options: UploadOptions
  ): Promise<UploadResult | null> => {
    if (!user) {
      setError('Usuário não autenticado');
      return null;
    }

    // Validar arquivo
    const validation = validateFile(file, options);
    if (!validation.valid) {
      setError(validation.error || 'Arquivo inválido');
      return null;
    }

    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      setProgress(10);

      // Gerar nome do arquivo
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const baseName = options.customFileName || crypto.randomUUID();
      const fileName = `${baseName}.${fileExt}`;
      
      // Definir pasta (padrão: user_id)
      const folder = options.folder ?? user.id;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      setProgress(30);

      // Fazer upload
      const { data, error: uploadError } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          cacheControl: options.cacheControl ?? DEFAULT_CACHE_CONTROL,
          upsert: options.upsert ?? false,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      setProgress(80);

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(data.path);

      setProgress(100);

      return {
        url: urlData.publicUrl,
        path: data.path,
        fileName,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao fazer upload';
      setError(message);
      // removed
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user, validateFile]);

  /**
   * Exclui um arquivo do Storage
   */
  const remove = useCallback(async (
    bucket: string,
    path: string
  ): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (deleteError) {
        // removed
        return false;
      }

      return true;
    } catch (err) {
      // removed
      return false;
    }
  }, []);

  /**
   * Exclui múltiplos arquivos do Storage
   */
  const removeMultiple = useCallback(async (
    bucket: string,
    paths: string[]
  ): Promise<boolean> => {
    if (paths.length === 0) return true;

    try {
      const { error: deleteError } = await supabase.storage
        .from(bucket)
        .remove(paths);

      if (deleteError) {
        // removed
        return false;
      }

      return true;
    } catch (err) {
      // removed
      return false;
    }
  }, []);

  /**
   * Obtém a URL pública de um arquivo
   */
  const getPublicUrl = useCallback((bucket: string, path: string): string => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }, []);

  /**
   * Extrai o path do arquivo a partir da URL pública
   */
  const extractPathFromUrl = useCallback((
    bucket: string,
    url: string
  ): string | null => {
    if (!url) return null;
    
    const marker = `/${bucket}/`;
    const index = url.indexOf(marker);
    
    if (index === -1) return null;
    
    return url.substring(index + marker.length);
  }, []);

  /**
   * Limpa o estado de erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUploading,
    progress,
    error,
    upload,
    remove,
    removeMultiple,
    getPublicUrl,
    extractPathFromUrl,
    validateFile,
    clearError,
  };
}

// ============================================
// CONSTANTES EXPORTADAS
// ============================================

/** Buckets disponíveis no sistema */
export const STORAGE_BUCKETS = {
  PERSON_PHOTOS: 'person-photos',
  CAMERA_THUMBNAILS: 'camera-thumbnails',
} as const;

/** Tipos de arquivo permitidos por categoria */
export const ALLOWED_FILE_TYPES = {
  IMAGES: ['image/jpeg', 'image/png', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  VIDEOS: ['video/mp4', 'video/webm', 'video/quicktime'],
} as const;

/** Tamanhos máximos de arquivo */
export const MAX_FILE_SIZES = {
  SMALL: 2 * 1024 * 1024,   // 2MB
  MEDIUM: 5 * 1024 * 1024,  // 5MB
  LARGE: 10 * 1024 * 1024,  // 10MB
  XLARGE: 50 * 1024 * 1024, // 50MB
} as const;
