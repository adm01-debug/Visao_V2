/**
 * VISÃO - Multi Camera Recognition Hook
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { playCriticalAlertSound } from '@/lib/alertSounds';

export interface RecognitionResult {
  cameraId: string;
  cameraName: string;
  personId: string | null;
  personName: string;
  confidence: number;
  isBlacklist: boolean;
  timestamp: Date;
  imageUrl?: string;
}

export type LayoutType = '1x1' | '2x2' | '3x3' | '4x4';

export function useMultiCameraRecognition() {
  const [activeFeeds, setActiveFeeds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<LayoutType>('2x2');
  const [captureInterval, setCaptureInterval] = useState(3000);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const personsCache = useRef<
    Map<string, { name: string; listType: string; photoUrl: string | null }>
  >(new Map());

  const { data: cameras, isLoading } = useQuery({
    queryKey: ['cameras-for-recognition'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cameras').select('*').order('name');
      if (error) throw error;
      return data || [];
    },
  });

  useQuery({
    queryKey: ['registered-persons-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, list_type, photo_url');
      if (error) throw error;
      data?.forEach((p) =>
        personsCache.current.set(p.id, {
          name: p.name,
          listType: p.list_type || 'none',
          photoUrl: p.photo_url,
        })
      );
      return data || [];
    },
  });

  const getLayoutClass = () => {
    const map: Record<LayoutType, string> = {
      '1x1': 'grid-cols-1',
      '2x2': 'grid-cols-1 md:grid-cols-2',
      '3x3': 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
      '4x4': 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    };
    return map[layout] || 'grid-cols-2';
  };

  const getMaxCameras = () => ({ '1x1': 1, '2x2': 4, '3x3': 9, '4x4': 16 })[layout] || 4;

  const captureFrame = useCallback((cameraId: string): string | null => {
    const video = videoRefs.current.get(cameraId);
    if (!video || video.readyState < 2) return null;
    let canvas = canvasRefs.current.get(cameraId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRefs.current.set(cameraId, canvas);
    }
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const analyzeFrame = useCallback(
    async (cameraId: string, cameraName: string) => {
      const imageData = captureFrame(cameraId);
      if (!imageData) return;
      try {
        const { data, error } = await supabase.functions.invoke('compare-faces', {
          body: { image: imageData, matchThreshold },
        });
        if (error) return;
        if (data?.matches?.length > 0) {
          for (const match of data.matches) {
            const personInfo = personsCache.current.get(match.personId);
            const isBlacklist = personInfo?.listType === 'blacklist';
            const result: RecognitionResult = {
              cameraId,
              cameraName,
              personId: match.personId,
              personName: personInfo?.name || 'Desconhecido',
              confidence: match.similarity,
              isBlacklist,
              timestamp: new Date(),
              imageUrl: imageData,
            };
            setRecognitionResults((prev) => [result, ...prev.slice(0, 49)]);
            if (isBlacklist && soundEnabled) {
              playCriticalAlertSound();
              toast.error(`🚨 ALERTA: ${result.personName} na blacklist!`, {
                description: `Detectado em ${cameraName}`,
                duration: 10000,
              });
            }
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              await supabase.from('recognition_logs').insert({
                camera_id: cameraId,
                person_id: match.personId,
                confidence: match.similarity,
                recognized: true,
                image_url: imageData,
                user_id: userData.user.id,
              });
            }
          }
        } else if (data?.facesDetected > 0) {
          setRecognitionResults((prev) => [
            {
              cameraId,
              cameraName,
              personId: null,
              personName: 'Desconhecido',
              confidence: 0,
              isBlacklist: false,
              timestamp: new Date(),
            },
            ...prev.slice(0, 49),
          ]);
        }
      } catch {
        /* silent */
      }
    },
    [captureFrame, matchThreshold, soundEnabled]
  );

  const startAnalysis = useCallback(
    (cameraId: string, cameraName: string) => {
      if (intervalsRef.current.has(cameraId)) return;
      const interval = setInterval(() => analyzeFrame(cameraId, cameraName), captureInterval);
      intervalsRef.current.set(cameraId, interval);
      setAnalyzingIds((prev) => {
        const next = new Set(prev);
        next.add(cameraId);
        return next;
      });
    },
    [analyzeFrame, captureInterval]
  );

  const stopAnalysis = useCallback((cameraId: string) => {
    const interval = intervalsRef.current.get(cameraId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(cameraId);
    }
    setAnalyzingIds((prev) => {
      const next = new Set(prev);
      next.delete(cameraId);
      return next;
    });
  }, []);

  const toggleCamera = (cameraId: string) => {
    setActiveFeeds((prev) => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
        stopAnalysis(cameraId);
      } else if (next.size < getMaxCameras()) {
        next.add(cameraId);
      } else {
        toast.warning(`Máximo de ${getMaxCameras()} câmeras para este layout`);
      }
      return next;
    });
  };

  const startAllCameras = () => {
    setIsGlobalRunning(true);
    activeFeeds.forEach((id) => {
      const c = cameras?.find((x) => x.id === id);
      if (c) startAnalysis(id, c.name);
    });
    toast.success('Análise iniciada em todas as câmeras');
  };

  const stopAllCameras = () => {
    setIsGlobalRunning(false);
    intervalsRef.current.forEach((_, id) => stopAnalysis(id));
    toast.info('Análise pausada');
  };

  const handleVideoLoaded = (cameraId: string, video: HTMLVideoElement) => {
    videoRefs.current.set(cameraId, video);
    if (isGlobalRunning) {
      const c = cameras?.find((x) => x.id === cameraId);
      if (c) startAnalysis(cameraId, c.name);
    }
  };

  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((_, id) => stopAnalysis(id));
    };
  }, [stopAnalysis]);

  const activeCameras = cameras?.filter((c) => activeFeeds.has(c.id)) || [];

  return {
    cameras,
    isLoading,
    activeFeeds,
    activeCameras,
    layout,
    setLayout,
    captureInterval,
    setCaptureInterval,
    matchThreshold,
    setMatchThreshold,
    soundEnabled,
    setSoundEnabled,
    isGlobalRunning,
    recognitionResults,
    fullscreenCamera,
    setFullscreenCamera,
    personsCache,
    toggleCamera,
    startAllCameras,
    stopAllCameras,
    handleVideoLoaded,
    getLayoutClass,
    getMaxCameras,
    analyzingIds,
  };
}
