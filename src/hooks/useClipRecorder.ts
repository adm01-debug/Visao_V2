/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useClipRecorder
 * 
 * Gerencia gravação de clips de vídeo:
 * - MediaRecorder API
 * - Geração de thumbnails
 * - Upload para Supabase Storage
 * - Metadados no banco
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'saving';
type TriggerType = 'manual' | 'rule' | 'motion' | 'alert' | 'scheduled';

interface RecordingConfig {
  maxDurationSeconds: number;
  preferredMimeType: string;
  videoBitsPerSecond: number;
  generateThumbnail: boolean;
  autoSave: boolean;
  showPreview: boolean;
}

interface ClipMetadata {
  cameraId: string;
  cameraName: string;
  triggerType: TriggerType;
  triggerRuleId?: string;
  alertId?: string;
  tags?: string[];
  notes?: string;
}

interface RecordedClip {
  id?: string;
  blob: Blob;
  url: string;
  thumbnailUrl?: string;
  thumbnailBlob?: Blob;
  startTime: Date;
  endTime: Date;
  duration: number;
  fileSize: number;
  mimeType: string;
  metadata: ClipMetadata;
}

interface UseClipRecorderOptions {
  cameraId: string;
  cameraName: string;
  maxDuration?: number;
  autoSave?: boolean;
  onRecordingStart?: () => void;
  onRecordingStop?: (clip: RecordedClip) => void;
  onRecordingSave?: (clipId: string) => void;
  onError?: (error: Error) => void;
}

interface UseClipRecorderReturn {
  // Estado
  state: RecordingState;
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  progress: number;
  currentClip: RecordedClip | null;
  clips: RecordedClip[];
  
  // Configuração
  config: RecordingConfig;
  updateConfig: (config: Partial<RecordingConfig>) => void;
  
  // Ações
  startRecording: (videoElement: HTMLVideoElement, triggerType?: TriggerType) => Promise<boolean>;
  stopRecording: () => Promise<RecordedClip | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  saveClip: (clip: RecordedClip) => Promise<string | null>;
  downloadClip: (clip: RecordedClip) => void;
  deleteClip: (clipId: string) => Promise<boolean>;
  clearClips: () => void;
  
  // Utilitários
  canRecord: boolean;
  supportedMimeTypes: string[];
  generateThumbnail: (videoElement: HTMLVideoElement) => Promise<Blob | null>;
}

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_CONFIG: RecordingConfig = {
  maxDurationSeconds: 60,
  preferredMimeType: 'video/webm;codecs=vp9',
  videoBitsPerSecond: 2500000, // 2.5 Mbps
  generateThumbnail: true,
  autoSave: false,
  showPreview: true,
};

const SUPPORTED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
];

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useClipRecorder(options: UseClipRecorderOptions): UseClipRecorderReturn {
  const {
    cameraId,
    cameraName,
    maxDuration = 60,
    autoSave = false,
    onRecordingStart,
    onRecordingStop,
    onRecordingSave,
    onError,
  } = options;

  // Estado
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [currentClip, setCurrentClip] = useState<RecordedClip | null>(null);
  const [clips, setClips] = useState<RecordedClip[]>([]);
  const [config, setConfig] = useState<RecordingConfig>({
    ...DEFAULT_CONFIG,
    maxDurationSeconds: maxDuration,
    autoSave,
  });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const triggerTypeRef = useRef<TriggerType>('manual');

  // Verificar suporte
  const canRecord = typeof MediaRecorder !== 'undefined';
  
  const supportedMimeTypes = SUPPORTED_MIME_TYPES.filter(type => 
    MediaRecorder.isTypeSupported(type)
  );

  // Limpar timers
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Gerar thumbnail
  const generateThumbnail = useCallback(async (videoElement: HTMLVideoElement): Promise<Blob | null> => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth || 320;
      canvas.height = videoElement.videoHeight || 240;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.8);
      });
    } catch (error) {
      // removed
      return null;
    }
  }, []);

  // Iniciar gravação
  const startRecording = useCallback(async (
    videoElement: HTMLVideoElement,
    triggerType: TriggerType = 'manual'
  ): Promise<boolean> => {
    if (!canRecord) {
      onError?.(new Error('MediaRecorder não suportado'));
      return false;
    }

    if (state !== 'idle') {
      return false;
    }

    try {
      // Obter stream do vídeo
      let stream: MediaStream;
      
      if ('captureStream' in videoElement) {
        stream = (videoElement as any).captureStream();
      } else if ('mozCaptureStream' in videoElement) {
        stream = (videoElement as any).mozCaptureStream();
      } else {
        throw new Error('Navegador não suporta captureStream');
      }

      streamRef.current = stream;
      triggerTypeRef.current = triggerType;

      // Escolher mime type
      const mimeType = supportedMimeTypes[0] || 'video/webm';

      // Criar MediaRecorder
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: config.videoBitsPerSecond,
      });

      chunksRef.current = [];
      startTimeRef.current = new Date();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        // removed
        onError?.(new Error('Erro na gravação'));
        setState('idle');
        clearTimer();
      };

      recorder.onstop = async () => {
        // Processar será feito em stopRecording
      };

      mediaRecorderRef.current = recorder;
      
      // Iniciar gravação
      recorder.start(1000); // Chunks de 1 segundo
      setState('recording');
      setDuration(0);

      // Timer para atualizar duração
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop quando atingir duração máxima
          if (newDuration >= config.maxDurationSeconds) {
            stopRecording();
          }
          
          return newDuration;
        });
      }, 1000);

      onRecordingStart?.();
      return true;

    } catch (error) {
      // removed
      onError?.(error as Error);
      return false;
    }
  }, [canRecord, state, config, supportedMimeTypes, onRecordingStart, onError, clearTimer]);

  // Parar gravação
  const stopRecording = useCallback(async (): Promise<RecordedClip | null> => {
    if (!mediaRecorderRef.current || state === 'idle') {
      return null;
    }

    return new Promise((resolve) => {
      setState('processing');
      clearTimer();

      const recorder = mediaRecorderRef.current!;
      
      recorder.onstop = async () => {
        try {
          const endTime = new Date();
          const startTime = startTimeRef.current || new Date();
          
          // Criar blob do vídeo
          const mimeType = recorder.mimeType || 'video/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);

          // Calcular duração real
          const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

          // Criar clip
          const clip: RecordedClip = {
            blob,
            url,
            startTime,
            endTime,
            duration: durationSeconds,
            fileSize: blob.size,
            mimeType,
            metadata: {
              cameraId,
              cameraName,
              triggerType: triggerTypeRef.current,
            },
          };

          // Gerar thumbnail se configurado
          // (Nota: precisaria de um video element para gerar thumbnail do blob)

          setCurrentClip(clip);
          setClips(prev => [...prev, clip]);
          
          onRecordingStop?.(clip);

          // Auto-save se configurado
          if (config.autoSave) {
            await saveClip(clip);
          }

          setState('idle');
          setDuration(0);
          
          // Limpar
          mediaRecorderRef.current = null;
          chunksRef.current = [];
          startTimeRef.current = null;
          
          if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
          }

          resolve(clip);

        } catch (error) {
          // removed
          onError?.(error as Error);
          setState('idle');
          resolve(null);
        }
      };

      recorder.stop();
    });
  }, [state, config, cameraId, cameraName, clearTimer, onRecordingStop, onError]);

  // Pausar gravação
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'recording') {
      mediaRecorderRef.current.pause();
      setState('paused');
      clearTimer();
    }
  }, [state, clearTimer]);

  // Retomar gravação
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && state === 'paused') {
      mediaRecorderRef.current.resume();
      setState('recording');
      
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= config.maxDurationSeconds) {
            stopRecording();
          }
          return prev + 1;
        });
      }, 1000);
    }
  }, [state, config.maxDurationSeconds, stopRecording]);

  // Cancelar gravação
  const cancelRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    clearTimer();
    setState('idle');
    setDuration(0);
    chunksRef.current = [];
    startTimeRef.current = null;
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    mediaRecorderRef.current = null;
  }, [clearTimer]);

  // Salvar clip no Supabase
  const saveClip = useCallback(async (clip: RecordedClip): Promise<string | null> => {
    try {
      setState('saving');

      // Upload do vídeo
      const fileName = `${cameraId}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('video-clips')
        .upload(fileName, clip.blob, {
          contentType: clip.mimeType,
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from('video-clips')
        .getPublicUrl(fileName);

      // Upload do thumbnail (se existir)
      let thumbnailUrl: string | undefined;
      if (clip.thumbnailBlob) {
        const thumbName = `${cameraId}/thumb_${Date.now()}.jpg`;
        const { data: thumbData, error: thumbError } = await supabase.storage
          .from('video-clips')
          .upload(thumbName, clip.thumbnailBlob, {
            contentType: 'image/jpeg',
          });

        if (!thumbError) {
          const { data: thumbUrlData } = supabase.storage
            .from('video-clips')
            .getPublicUrl(thumbName);
          thumbnailUrl = thumbUrlData?.publicUrl;
        }
      }

      // Salvar metadados no banco
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data: clipRecord, error: dbError } = await supabase
        .from('video_clips')
        .insert({
          camera_id: cameraId,
          user_id: user.id,
          start_time: clip.startTime.toISOString(),
          end_time: clip.endTime.toISOString(),
          duration: clip.duration,
          file_url: urlData?.publicUrl,
          thumbnail_url: thumbnailUrl,
          status: 'completed',
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Atualizar clip com ID
      clip.id = clipRecord.id;
      setClips(prev => 
        prev.map(c => c.url === clip.url ? { ...c, id: clipRecord.id } : c)
      );

      setState('idle');
      onRecordingSave?.(clipRecord.id);
      toast.success('Gravação salva');
      
      return clipRecord.id;

    } catch (error) {
      // removed
      onError?.(error as Error);
      toast.error('Erro ao salvar gravação');
      setState('idle');
      return null;
    }
  }, [cameraId, onRecordingSave, onError]);

  // Download clip
  const downloadClip = useCallback((clip: RecordedClip) => {
    const a = document.createElement('a');
    a.href = clip.url;
    a.download = `${cameraName}_${clip.startTime.toISOString().replace(/[:.]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('Download iniciado');
  }, [cameraName]);

  // Deletar clip
  const deleteClip = useCallback(async (clipId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('video_clips')
        .delete()
        .eq('id', clipId);

      if (error) throw error;

      setClips(prev => prev.filter(c => c.id !== clipId));
      toast.success('Gravação excluída');
      return true;

    } catch (error) {
      // removed
      toast.error('Erro ao excluir gravação');
      return false;
    }
  }, []);

  // Limpar clips locais
  const clearClips = useCallback(() => {
    clips.forEach(clip => {
      if (clip.url.startsWith('blob:')) {
        URL.revokeObjectURL(clip.url);
      }
      if (clip.thumbnailUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(clip.thumbnailUrl);
      }
    });
    setClips([]);
    setCurrentClip(null);
  }, [clips]);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<RecordingConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      // Revogar URLs
      clips.forEach(clip => {
        if (clip.url.startsWith('blob:')) {
          URL.revokeObjectURL(clip.url);
        }
      });
    };
  }, [clearTimer, clips]);

  // Progresso (0-100)
  const progress = config.maxDurationSeconds > 0 
    ? Math.min((duration / config.maxDurationSeconds) * 100, 100)
    : 0;

  return {
    // Estado
    state,
    isRecording: state === 'recording',
    isPaused: state === 'paused',
    duration,
    progress,
    currentClip,
    clips,
    
    // Configuração
    config,
    updateConfig,
    
    // Ações
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    saveClip,
    downloadClip,
    deleteClip,
    clearClips,
    
    // Utilitários
    canRecord,
    supportedMimeTypes,
    generateThumbnail,
  };
}

export default useClipRecorder;
