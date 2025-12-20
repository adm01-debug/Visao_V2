/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceAPI (Simulação)
 * 
 * Detecção facial simulada - implementação real requer face-api.js
 */

import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export interface FaceDetection {
  id: string;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  descriptor?: Float32Array;
  expressions?: {
    neutral: number;
    happy: number;
    sad: number;
    angry: number;
    fearful: number;
    disgusted: number;
    surprised: number;
  };
  age?: number;
  gender?: 'male' | 'female';
  genderProbability?: number;
}

export interface FaceMatch {
  personId: string;
  personName: string;
  distance: number;
  similarity: number;
  isMatch: boolean;
  status: 'known' | 'unknown' | 'blacklist' | 'vip';
  photoUrl?: string;
}

export interface RegisteredFace {
  id: string;
  personId: string;
  personName: string;
  descriptor: number[];
  status: 'active' | 'blacklist' | 'vip' | 'inactive';
  photoUrl?: string;
}

export interface FaceAPIConfig {
  modelPath: string;
  minConfidence: number;
  matchThreshold: number;
  inputSize: 224 | 320 | 416 | 512 | 608;
  scoreThreshold: number;
  detectExpressions: boolean;
  detectAge: boolean;
  detectGender: boolean;
  maxFaces: number;
}

// ============================================
// CONFIGURAÇÃO PADRÃO
// ============================================

const DEFAULT_CONFIG: FaceAPIConfig = {
  modelPath: '/models',
  minConfidence: 0.5,
  matchThreshold: 0.6,
  inputSize: 416,
  scoreThreshold: 0.5,
  detectExpressions: false,
  detectAge: false,
  detectGender: false,
  maxFaces: 10,
};

// ============================================
// HOOK PRINCIPAL (SIMULAÇÃO)
// ============================================

interface UseFaceAPIOptions {
  config?: Partial<FaceAPIConfig>;
  autoLoadModels?: boolean;
  onFaceDetected?: (faces: FaceDetection[]) => void;
  onFaceMatched?: (match: FaceMatch, face: FaceDetection) => void;
  onError?: (error: Error) => void;
}

interface UseFaceAPIReturn {
  modelsLoaded: boolean;
  loading: boolean;
  error: string | null;
  registeredFaces: RegisteredFace[];
  detectFaces: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetection[]>;
  detectSingleFace: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetection | null>;
  matchFace: (descriptor: Float32Array) => Promise<FaceMatch | null>;
  matchAllFaces: (detections: FaceDetection[]) => Promise<Map<string, FaceMatch>>;
  registerFace: (personId: string, personName: string, descriptor: Float32Array, status?: string) => Promise<boolean>;
  loadRegisteredFaces: () => Promise<void>;
  extractDescriptor: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<Float32Array | null>;
  calculateSimilarity: (descriptor1: Float32Array, descriptor2: Float32Array) => number;
  drawDetections: (canvas: HTMLCanvasElement, detections: FaceDetection[], matches?: Map<string, FaceMatch>) => void;
  config: FaceAPIConfig;
  updateConfig: (updates: Partial<FaceAPIConfig>) => void;
}

export function useFaceAPI(options: UseFaceAPIOptions = {}): UseFaceAPIReturn {
  const { 
    config: initialConfig, 
    onFaceDetected,
    onFaceMatched,
  } = options;

  const [config, setConfig] = useState<FaceAPIConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  // Simulação - modelos não são realmente carregados
  const [modelsLoaded] = useState(true);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);

  // Carregar rostos cadastrados do banco
  const loadRegisteredFaces = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('registered_persons')
        .select('id, name, photo_url, list_type, face_encoding')
        .not('face_encoding', 'is', null);

      if (dbError) throw dbError;

      const faces: RegisteredFace[] = (data || []).map(person => ({
        id: `face-${person.id}`,
        personId: person.id,
        personName: person.name,
        descriptor: (person.face_encoding as number[]) || [],
        status: (person.list_type as 'active' | 'blacklist' | 'vip' | 'inactive') || 'active',
        photoUrl: person.photo_url || undefined,
      })).filter(f => f.descriptor.length === 128);

      setRegisteredFaces(faces);
      console.log(`[FaceAPI] ${faces.length} rostos cadastrados carregados`);
    } catch (err) {
      console.error('[FaceAPI] Erro ao carregar rostos:', err);
    }
  }, []);

  // Detecção simulada
  const detectFaces = useCallback(async (
    _input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> => {
    // Simulação - retorna detecção aleatória
    const faces: FaceDetection[] = [];
    
    // 30% de chance de detectar um rosto
    if (Math.random() > 0.7) {
      faces.push({
        id: `face-${Date.now()}`,
        box: {
          x: 100 + Math.random() * 200,
          y: 80 + Math.random() * 100,
          width: 120 + Math.random() * 60,
          height: 140 + Math.random() * 60,
        },
        descriptor: new Float32Array(128).map(() => Math.random()),
      });
    }

    onFaceDetected?.(faces);
    return faces;
  }, [onFaceDetected]);

  const detectSingleFace = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection | null> => {
    const faces = await detectFaces(input);
    return faces.length > 0 ? faces[0] : null;
  }, [detectFaces]);

  // Match simulado
  const matchFace = useCallback(async (_descriptor: Float32Array): Promise<FaceMatch | null> => {
    if (registeredFaces.length === 0) {
      return {
        personId: 'unknown',
        personName: 'Desconhecido',
        distance: 0.8,
        similarity: 0.2,
        isMatch: false,
        status: 'unknown',
      };
    }

    // Simulação - 40% de chance de match com pessoa cadastrada
    if (Math.random() > 0.6) {
      const randomPerson = registeredFaces[Math.floor(Math.random() * registeredFaces.length)];
      return {
        personId: randomPerson.personId,
        personName: randomPerson.personName,
        distance: 0.3 + Math.random() * 0.2,
        similarity: 0.5 + Math.random() * 0.4,
        isMatch: true,
        status: randomPerson.status as 'known' | 'unknown' | 'blacklist' | 'vip',
        photoUrl: randomPerson.photoUrl,
      };
    }

    return {
      personId: 'unknown',
      personName: 'Desconhecido',
      distance: 0.7 + Math.random() * 0.2,
      similarity: 0.1 + Math.random() * 0.2,
      isMatch: false,
      status: 'unknown',
    };
  }, [registeredFaces]);

  const matchAllFaces = useCallback(async (
    detections: FaceDetection[]
  ): Promise<Map<string, FaceMatch>> => {
    const matches = new Map<string, FaceMatch>();

    for (const face of detections) {
      if (face.descriptor) {
        const match = await matchFace(face.descriptor);
        if (match) {
          matches.set(face.id, match);
          if (match.isMatch) {
            onFaceMatched?.(match, face);
          }
        }
      }
    }

    return matches;
  }, [matchFace, onFaceMatched]);

  const registerFace = useCallback(async (
    personId: string,
    personName: string,
    descriptor: Float32Array,
    _status: string = 'active'
  ): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('registered_persons')
        .update({
          face_encoding: Array.from(descriptor),
        })
        .eq('id', personId);

      if (dbError) throw dbError;

      await loadRegisteredFaces();
      toast.success(`Rosto de ${personName} cadastrado com sucesso`);
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      toast.error(`Erro ao cadastrar rosto: ${message}`);
      return false;
    }
  }, [loadRegisteredFaces]);

  const extractDescriptor = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array | null> => {
    const face = await detectSingleFace(input);
    return face?.descriptor || null;
  }, [detectSingleFace]);

  const calculateSimilarity = useCallback((
    descriptor1: Float32Array,
    descriptor2: Float32Array
  ): number => {
    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
    }
    const distance = Math.sqrt(sum);
    return Math.max(0, 1 - distance);
  }, []);

  const drawDetections = useCallback((
    canvas: HTMLCanvasElement,
    detections: FaceDetection[],
    matches?: Map<string, FaceMatch>
  ) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(face => {
      const { x, y, width, height } = face.box;
      const match = matches?.get(face.id);

      let color = '#3b82f6';
      let label = 'Desconhecido';

      if (match) {
        if (match.status === 'blacklist') {
          color = '#ef4444';
          label = `⚠️ ${match.personName}`;
        } else if (match.status === 'vip') {
          color = '#22c55e';
          label = `⭐ ${match.personName}`;
        } else if (match.isMatch) {
          color = '#22c55e';
          label = match.personName;
        }
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      ctx.fillStyle = color;
      ctx.font = '14px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 22, textWidth + 10, 22);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 5, y - 6);

      if (match && match.isMatch) {
        const similarity = `${(match.similarity * 100).toFixed(0)}%`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y + height, 50, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(similarity, x + 5, y + height + 13);
      }
    });
  }, []);

  const updateConfig = useCallback((updates: Partial<FaceAPIConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    modelsLoaded,
    loading,
    error,
    registeredFaces,
    detectFaces,
    detectSingleFace,
    matchFace,
    matchAllFaces,
    registerFace,
    loadRegisteredFaces,
    extractDescriptor,
    calculateSimilarity,
    drawDetections,
    config,
    updateConfig,
  };
}

export default useFaceAPI;
