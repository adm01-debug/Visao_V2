/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useClipRecorder
 * 
 * Motor de gravação de clips de vídeo com suporte a:
 * - Gravação manual e automática (por alertas/regras)
 * - Pre-buffer (captura frames antes do evento)
 * - Upload para Supabase Storage
 * - Geração de thumbnails
 * 
 * @example
 * const {
 *   isRecording,
 *   startRecording,
 *   stopRecording,
 *   clips,
 * } = useClipRecorder({
 *   cameraId: 'cam-001',
 *   getFrame: () => captureFrame(),
 *   onClipReady: (clip) => saveClip(clip),
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  RecordingConfig,
  RecordingSession,
  RecordingStatus,
  RecordingTrigger,
  RecordingEvents,
  VideoClip,
  ClipFormat,
  defaultRecordingConfig,
  generateClipFilename,
  formatDuration,
  formatFileSize,
} from '@/types/clips';
import { toast } from 'sonner';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseClipRecorderOptions extends RecordingEvents {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName?: string;
  
  /** Função para obter frame atual (retorna Blob ou base64) */
  getFrame: () => Promise<Blob | null> | Blob | null;
  
  /** Configuração inicial */
  config?: Partial<RecordingConfig>;
  
  /** Habilitar pre-buffer */
  enablePreBuffer?: boolean;
  
  /** Intervalo de captura de frames (ms) */
  captureInterval?: number;
  
  /** Upload automático para cloud */
  autoUpload?: boolean;
  
  /** Salvar no banco de dados */
  saveToDatabase?: boolean;
}

interface UseClipRecorderReturn {
  /** Está gravando agora */
  isRecording: boolean;
  
  /** Status atual */
  status: RecordingStatus;
  
  /** Sessão de gravação ativa */
  session: RecordingSession | null;
  
  /** Duração atual (segundos) */
  currentDuration: number;
  
  /** Frames capturados */
  frameCount: number;
  
  /** Clips gravados nesta sessão */
  clips: VideoClip[];
  
  /** Iniciar gravação manual */
  startRecording: (trigger?: RecordingTrigger, triggerId?: string, triggerDetails?: any) => void;
  
  /** Parar gravação */
  stopRecording: () => Promise<VideoClip | null>;
  
  /** Gravar por trigger automático (alerta, regra, etc) */
  triggerRecording: (
    trigger: RecordingTrigger,
    triggerId: string,
    triggerDetails?: any
  ) => void;
  
  /** Atualizar configuração */
  updateConfig: (updates: Partial<RecordingConfig>) => void;
  
  /** Limpar clips locais */
  clearClips: () => void;
  
  /** Fazer upload de um clip */
  uploadClip: (clip: VideoClip) => Promise<string | null>;
  
  /** Deletar um clip */
  deleteClip: (clipId: string) => Promise<void>;
  
  /** Baixar clip */
  downloadClip: (clip: VideoClip) => void;
  
  /** Erro atual */
  error: string | null;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useClipRecorder(
  options: UseClipRecorderOptions
): UseClipRecorderReturn {
  const {
    cameraId,
    cameraName = 'Câmera',
    getFrame,
    config: initialConfig,
    enablePreBuffer = true,
    captureInterval = 100, // 10 FPS default
    autoUpload = true,
    saveToDatabase = true,
    onRecordingStart,
    onFrameCapture,
    onRecordingEnd,
    onClipReady,
    onUploadComplete,
    onRecordingError,
    onProcessingProgress,
  } = options;

  // Estado
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [session, setSession] = useState<RecordingSession | null>(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const configRef = useRef<RecordingConfig>({
    ...defaultRecordingConfig,
    ...initialConfig,
    id: crypto.randomUUID(),
    cameraId,
  });
  const sessionRef = useRef<RecordingSession | null>(null);
  const framesRef = useRef<Blob[]>([]);
  const preBufferRef = useRef<Blob[]>([]);
  const captureIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const preBufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ============================================
  // PRE-BUFFER (captura contínua antes do evento)
  // ============================================

  const startPreBuffer = useCallback(() => {
    if (!enablePreBuffer) return;

    const config = configRef.current;
    const maxPreBufferFrames = Math.ceil(
      (config.preEventSeconds * 1000) / captureInterval
    );

    preBufferIntervalRef.current = setInterval(async () => {
      if (isRecording) return; // Não capturar pre-buffer durante gravação

      try {
        const frame = await getFrame();
        if (frame) {
          preBufferRef.current.push(frame);
          // Manter apenas os últimos N frames
          if (preBufferRef.current.length > maxPreBufferFrames) {
            preBufferRef.current.shift();
          }
        }
      } catch (err) {
        console.error('[ClipRecorder] Erro no pre-buffer:', err);
      }
    }, captureInterval);
  }, [enablePreBuffer, captureInterval, getFrame, isRecording]);

  const stopPreBuffer = useCallback(() => {
    if (preBufferIntervalRef.current) {
      clearInterval(preBufferIntervalRef.current);
      preBufferIntervalRef.current = null;
    }
  }, []);

  // ============================================
  // CAPTURA DE FRAMES
  // ============================================

  const captureFrames = useCallback(() => {
    captureIntervalRef.current = setInterval(async () => {
      const currentSession = sessionRef.current;
      if (!currentSession || currentSession.status !== 'recording') return;

      try {
        const frame = await getFrame();
        if (frame) {
          framesRef.current.push(frame);
          const newFrameCount = framesRef.current.length;
          setFrameCount(newFrameCount);
          
          currentSession.frameCount = newFrameCount;
          currentSession.frames = framesRef.current;
          
          onFrameCapture?.(currentSession, newFrameCount);

          // Verificar duração máxima
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed >= configRef.current.maxDuration) {
            stopRecording();
          }
        }
      } catch (err) {
        console.error('[ClipRecorder] Erro na captura:', err);
      }
    }, captureInterval);
  }, [captureInterval, getFrame, onFrameCapture]);

  const stopCapture = useCallback(() => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }, []);

  // ============================================
  // CRIAR VÍDEO A PARTIR DOS FRAMES
  // ============================================

  const createVideoFromFrames = useCallback(async (
    frames: Blob[],
    format: ClipFormat
  ): Promise<Blob | null> => {
    if (frames.length === 0) return null;

    const config = configRef.current;
    
    // Para formato GIF, criar GIF animado
    if (format === 'gif') {
      return createGifFromFrames(frames);
    }

    // Para MP4/WebM, usar MediaRecorder se disponível
    // ou criar vídeo a partir de canvas
    try {
      const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm';
      
      // Criar canvas para desenhar frames
      const firstFrame = frames[0];
      const img = await createImageBitmap(firstFrame);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;

      // Criar MediaRecorder se suportado
      const stream = canvas.captureStream(config.fps);
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback para webm
        const webmType = 'video/webm;codecs=vp8';
        if (!MediaRecorder.isTypeSupported(webmType)) {
          throw new Error('Formato de vídeo não suportado pelo navegador');
        }
      }

      return new Promise((resolve, reject) => {
        const chunks: Blob[] = [];
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
          videoBitsPerSecond: getVideoBitrate(config.quality),
        });

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder.mimeType });
          resolve(blob);
        };

        recorder.onerror = (e) => {
          reject(new Error('Erro ao gravar vídeo'));
        };

        recorder.start();

        // Desenhar cada frame no canvas
        let frameIndex = 0;
        const frameInterval = 1000 / config.fps;

        const drawNextFrame = async () => {
          if (frameIndex >= frames.length) {
            recorder.stop();
            return;
          }

          const frameBitmap = await createImageBitmap(frames[frameIndex]);
          ctx.drawImage(frameBitmap, 0, 0);
          
          // Adicionar marca d'água se configurado
          if (config.watermark?.enabled) {
            drawWatermark(ctx, canvas.width, canvas.height, config.watermark);
          }

          frameIndex++;
          onProcessingProgress?.(
            Math.round((frameIndex / frames.length) * 100),
            sessionRef.current!
          );

          setTimeout(drawNextFrame, frameInterval);
        };

        drawNextFrame();
      });
    } catch (err) {
      console.error('[ClipRecorder] Erro ao criar vídeo:', err);
      throw err;
    }
  }, [onProcessingProgress]);

  // ============================================
  // HELPERS
  // ============================================

  const getVideoBitrate = (quality: string): number => {
    const bitrates: Record<string, number> = {
      low: 500000,
      medium: 1500000,
      high: 3000000,
      original: 5000000,
    };
    return bitrates[quality] || 1500000;
  };

  const drawWatermark = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    watermark: NonNullable<RecordingConfig['watermark']>
  ) => {
    const padding = 10;
    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;

    let text = watermark.text || cameraName;
    if (watermark.includeTimestamp) {
      text += ` | ${new Date().toLocaleString('pt-BR')}`;
    }

    const textWidth = ctx.measureText(text).width;
    let x = padding;
    let y = padding + fontSize;

    switch (watermark.position) {
      case 'top-right':
        x = width - textWidth - padding;
        break;
      case 'bottom-left':
        y = height - padding;
        break;
      case 'bottom-right':
        x = width - textWidth - padding;
        y = height - padding;
        break;
    }

    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
  };

  const createGifFromFrames = async (frames: Blob[]): Promise<Blob> => {
    // Implementação simplificada - em produção usar biblioteca como gif.js
    // Por agora, retornar primeiro frame como imagem
    return frames[0];
  };

  const createThumbnail = async (frames: Blob[]): Promise<string | null> => {
    if (frames.length === 0) return null;
    
    // Pegar frame do meio
    const middleFrame = frames[Math.floor(frames.length / 2)];
    
    try {
      const img = await createImageBitmap(middleFrame);
      const canvas = document.createElement('canvas');
      const maxSize = 320;
      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      return canvas.toDataURL('image/jpeg', 0.7);
    } catch (err) {
      console.error('[ClipRecorder] Erro ao criar thumbnail:', err);
      return null;
    }
  };

  // ============================================
  // UPLOAD PARA CLOUD
  // ============================================

  const uploadClip = useCallback(async (clip: VideoClip): Promise<string | null> => {
    if (!clip.localUrl) return null;

    const config = configRef.current;
    if (!config.storage.uploadToCloud) return null;

    try {
      // Buscar blob da URL local
      const response = await fetch(clip.localUrl);
      const blob = await response.blob();

      const bucket = config.storage.bucket || 'clips';
      const filePath = `${cameraId}/${clip.id}.${clip.format}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, blob, {
          contentType: `video/${clip.format}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Atualizar clip
      const updatedClip = {
        ...clip,
        fileUrl: publicUrl,
        status: 'ready' as const,
      };

      setClips(prev => prev.map(c => c.id === clip.id ? updatedClip : c));
      onUploadComplete?.(updatedClip);

      return publicUrl;
    } catch (err) {
      console.error('[ClipRecorder] Erro no upload:', err);
      const errorMsg = err instanceof Error ? err.message : 'Erro no upload';
      setError(errorMsg);
      return null;
    }
  }, [cameraId, onUploadComplete]);

  // ============================================
  // SALVAR NO BANCO
  // ============================================
  // SALVAR NO BANCO
  // ============================================

  const saveClipToDatabase = useCallback(async (clip: VideoClip) => {
    if (!saveToDatabase) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[ClipRecorder] Usuário não autenticado - clip não será salvo');
        return;
      }

      await supabase.from('video_clips').insert({
        id: clip.id,
        camera_id: cameraId,
        user_id: user.id,
        start_time: clip.startedAt.toISOString(),
        end_time: clip.endedAt?.toISOString(),
        duration: clip.duration,
        file_url: clip.fileUrl,
        thumbnail_url: clip.thumbnailUrl,
        status: clip.status,
      });
      
      console.log('[ClipRecorder] Clip salvo no banco de dados');
    } catch (err) {
      console.error('[ClipRecorder] Erro ao salvar clip:', err);
    }
  }, [saveToDatabase, cameraId]);

  // ============================================
  // API PÚBLICA
  // ============================================

  const startRecording = useCallback((
    trigger: RecordingTrigger = 'manual',
    triggerId?: string,
    triggerDetails?: any
  ) => {
    if (isRecording) return;

    const config = configRef.current;
    
    // Criar nova sessão
    const newSession: RecordingSession = {
      id: crypto.randomUUID(),
      cameraId,
      status: 'recording',
      config,
      trigger,
      triggerId,
      frames: [],
      frameCount: 0,
      startedAt: new Date(),
      currentDuration: 0,
      preBuffer: enablePreBuffer ? [...preBufferRef.current] : [],
    };

    // Incluir pre-buffer nos frames iniciais
    framesRef.current = enablePreBuffer ? [...preBufferRef.current] : [];
    preBufferRef.current = [];
    
    sessionRef.current = newSession;
    startTimeRef.current = Date.now();

    setSession(newSession);
    setIsRecording(true);
    setStatus('recording');
    setFrameCount(framesRef.current.length);
    setError(null);

    // Parar pre-buffer durante gravação
    stopPreBuffer();

    // Iniciar captura
    captureFrames();

    // Atualizar duração
    durationIntervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      setCurrentDuration(elapsed);
    }, 100);

    onRecordingStart?.(newSession);
    
    toast.info(`Gravando clip - ${cameraName}`, {
      description: `Trigger: ${trigger}`,
    });
  }, [
    isRecording,
    cameraId,
    cameraName,
    enablePreBuffer,
    stopPreBuffer,
    captureFrames,
    onRecordingStart,
  ]);

  const stopRecording = useCallback(async (): Promise<VideoClip | null> => {
    if (!isRecording || !sessionRef.current) return null;

    const currentSession = sessionRef.current;
    const config = configRef.current;

    // Parar captura
    stopCapture();
    setIsRecording(false);
    setStatus('processing');

    const endTime = new Date();
    const duration = (Date.now() - startTimeRef.current) / 1000;

    // Verificar duração mínima
    if (duration < config.minDuration) {
      setStatus('idle');
      setSession(null);
      toast.warning('Gravação muito curta', {
        description: `Mínimo: ${config.minDuration}s`,
      });
      startPreBuffer(); // Reiniciar pre-buffer
      return null;
    }

    try {
      onRecordingEnd?.(currentSession);

      // Criar vídeo
      const videoBlob = await createVideoFromFrames(
        framesRef.current,
        config.format
      );

      if (!videoBlob) {
        throw new Error('Falha ao criar vídeo');
      }

      // Criar thumbnail
      const thumbnailUrl = await createThumbnail(framesRef.current);

      // Criar URL local
      const localUrl = URL.createObjectURL(videoBlob);

      // Criar clip
      const clip: VideoClip = {
        id: currentSession.id,
        cameraId,
        cameraName,
        status: 'ready',
        trigger: currentSession.trigger,
        triggerId: currentSession.triggerId,
        triggerDetails: currentSession.triggerDetails,
        startedAt: currentSession.startedAt,
        endedAt: endTime,
        duration,
        localUrl,
        fileSize: videoBlob.size,
        format: config.format,
        thumbnailUrl: thumbnailUrl || undefined,
        frameCount: framesRef.current.length,
        metadata: {
          fps: config.fps,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Adicionar aos clips
      setClips(prev => [clip, ...prev]);
      
      // Limpar
      framesRef.current = [];
      sessionRef.current = null;
      setSession(null);
      setStatus('idle');
      setCurrentDuration(0);
      setFrameCount(0);

      // Reiniciar pre-buffer
      startPreBuffer();

      onClipReady?.(clip);

      toast.success('Clip gravado!', {
        description: `${formatDuration(duration)} | ${formatFileSize(videoBlob.size)}`,
      });

      // Upload automático
      if (autoUpload && config.storage.uploadToCloud) {
        setStatus('uploading');
        const uploadedUrl = await uploadClip(clip);
        if (uploadedUrl) {
          clip.fileUrl = uploadedUrl;
        }
        setStatus('idle');
      }

      // Salvar no banco
      await saveClipToDatabase(clip);

      return clip;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao processar clip';
      setError(errorMsg);
      setStatus('error');
      onRecordingError?.(err instanceof Error ? err : new Error(errorMsg), currentSession);
      
      toast.error('Erro na gravação', { description: errorMsg });
      
      // Reiniciar pre-buffer mesmo com erro
      startPreBuffer();
      
      return null;
    }
  }, [
    isRecording,
    stopCapture,
    createVideoFromFrames,
    cameraId,
    cameraName,
    autoUpload,
    uploadClip,
    saveClipToDatabase,
    startPreBuffer,
    onRecordingEnd,
    onClipReady,
    onRecordingError,
  ]);

  const triggerRecording = useCallback((
    trigger: RecordingTrigger,
    triggerId: string,
    triggerDetails?: any
  ) => {
    const config = configRef.current;

    // Verificar se trigger está habilitado
    if (trigger === 'alert' && !config.autoTriggers.onAlert) return;
    if (trigger === 'motion' && !config.autoTriggers.onMotion) return;
    if (trigger === 'rule' && !config.autoTriggers.onRule) return;

    // Verificar severidade mínima
    if (triggerDetails?.severity && config.autoTriggers.minSeverity) {
      const levels = ['low', 'medium', 'high', 'critical'];
      const triggerLevel = levels.indexOf(triggerDetails.severity);
      const minLevel = levels.indexOf(config.autoTriggers.minSeverity);
      if (triggerLevel < minLevel) return;
    }

    // Iniciar gravação
    startRecording(trigger, triggerId, triggerDetails);

    // Parar automaticamente após postEventSeconds
    setTimeout(() => {
      if (sessionRef.current?.trigger === trigger && 
          sessionRef.current?.triggerId === triggerId) {
        stopRecording();
      }
    }, (config.preEventSeconds + config.postEventSeconds) * 1000);
  }, [startRecording, stopRecording]);

  const updateConfig = useCallback((updates: Partial<RecordingConfig>) => {
    configRef.current = {
      ...configRef.current,
      ...updates,
    };
  }, []);

  const clearClips = useCallback(() => {
    // Revogar URLs de blob
    clips.forEach(clip => {
      if (clip.localUrl) {
        URL.revokeObjectURL(clip.localUrl);
      }
    });
    setClips([]);
  }, [clips]);

  const deleteClip = useCallback(async (clipId: string) => {
    const clip = clips.find(c => c.id === clipId);
    if (!clip) return;

    // Revogar URL local
    if (clip.localUrl) {
      URL.revokeObjectURL(clip.localUrl);
    }

    // Deletar do storage
    if (clip.fileUrl) {
      const config = configRef.current;
      const bucket = config.storage.bucket || 'clips';
      const filePath = `${cameraId}/${clip.id}.${clip.format}`;
      
      await supabase.storage.from(bucket).remove([filePath]);
    }

    // Nota: tabela video_clips não existe no schema atual
    // Funcionalidade de deleção do banco desabilitada
    if (saveToDatabase) {
      console.log('[ClipRecorder] Deleção de clips do banco desabilitada - tabela não existe');
    }

    setClips(prev => prev.filter(c => c.id !== clipId));
    toast.success('Clip deletado');
  }, [clips, cameraId, saveToDatabase]);

  const downloadClip = useCallback((clip: VideoClip) => {
    const url = clip.localUrl || clip.fileUrl;
    if (!url) return;

    const filename = generateClipFilename(
      clip.cameraName,
      clip.trigger,
      clip.startedAt,
      clip.format
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
  }, []);

  // ============================================
  // EFEITOS
  // ============================================

  // Iniciar pre-buffer ao montar
  useEffect(() => {
    startPreBuffer();
    return () => {
      stopPreBuffer();
      stopCapture();
    };
  }, [startPreBuffer, stopPreBuffer, stopCapture]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      // Revogar URLs de blob
      clips.forEach(clip => {
        if (clip.localUrl) {
          URL.revokeObjectURL(clip.localUrl);
        }
      });
    };
  }, []);

  // ============================================
  // RETORNO
  // ============================================

  return {
    isRecording,
    status,
    session,
    currentDuration,
    frameCount,
    clips,
    startRecording,
    stopRecording,
    triggerRecording,
    updateConfig,
    clearClips,
    uploadClip,
    deleteClip,
    downloadClip,
    error,
  };
}

export default useClipRecorder;
