/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceAPI
 * 
 * Detecção facial real usando face-api.js:
 * - Carregamento de modelos
 * - Detecção de rostos em tempo real
 * - Extração de face descriptors (128D vectors)
 * - Comparação com rostos cadastrados
 * - Reconhecimento facial
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import * as faceapi from 'face-api.js';
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
  landmarks?: faceapi.FaceLandmarks68;
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
// HOOK PRINCIPAL
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
    autoLoadModels = true,
    onFaceDetected,
    onFaceMatched,
    onError,
  } = options;

  const [config, setConfig] = useState<FaceAPIConfig>({
    ...DEFAULT_CONFIG,
    ...initialConfig,
  });

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredFaces, setRegisteredFaces] = useState<RegisteredFace[]>([]);

  const faceMatcher = useRef<faceapi.FaceMatcher | null>(null);

  // Carregar modelos
  const loadModels = useCallback(async () => {
    if (modelsLoaded) return;

    setLoading(true);
    setError(null);

    try {
      const MODEL_URL = config.modelPath;

      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ...(config.detectExpressions ? [faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)] : []),
        ...(config.detectAge || config.detectGender ? [faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)] : []),
      ]);

      setModelsLoaded(true);
      console.log('[FaceAPI] Modelos carregados com sucesso');
    } catch (err: any) {
      const message = `Erro ao carregar modelos: ${err.message}`;
      setError(message);
      onError?.(err);
      console.error('[FaceAPI]', message);
    } finally {
      setLoading(false);
    }
  }, [config.modelPath, config.detectExpressions, config.detectAge, config.detectGender, modelsLoaded, onError]);

  // Auto load
  useEffect(() => {
    if (autoLoadModels) {
      loadModels();
    }
  }, [autoLoadModels, loadModels]);

  // Carregar rostos cadastrados
  const loadRegisteredFaces = useCallback(async () => {
    try {
      const { data, error: dbError } = await supabase
        .from('registered_persons')
        .select('id, name, photo_url, status, face_encoding')
        .not('face_encoding', 'is', null);

      if (dbError) throw dbError;

      const faces: RegisteredFace[] = (data || []).map(person => ({
        id: `face-${person.id}`,
        personId: person.id,
        personName: person.name,
        descriptor: person.face_encoding || [],
        status: person.status || 'active',
        photoUrl: person.photo_url,
      })).filter(f => f.descriptor.length === 128);

      setRegisteredFaces(faces);

      // Criar FaceMatcher
      if (faces.length > 0) {
        const labeledDescriptors = faces.map(face => 
          new faceapi.LabeledFaceDescriptors(
            face.personId,
            [new Float32Array(face.descriptor)]
          )
        );
        faceMatcher.current = new faceapi.FaceMatcher(labeledDescriptors, config.matchThreshold);
      }

      console.log(`[FaceAPI] ${faces.length} rostos cadastrados carregados`);
    } catch (err: any) {
      console.error('[FaceAPI] Erro ao carregar rostos:', err);
    }
  }, [config.matchThreshold]);

  // Carregar rostos ao iniciar
  useEffect(() => {
    if (modelsLoaded) {
      loadRegisteredFaces();
    }
  }, [modelsLoaded, loadRegisteredFaces]);

  // Detectar rostos
  const detectFaces = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection[]> => {
    if (!modelsLoaded) {
      console.warn('[FaceAPI] Modelos não carregados');
      return [];
    }

    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: config.inputSize,
        scoreThreshold: config.scoreThreshold,
      });

      let detections = await faceapi
        .detectAllFaces(input, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (config.detectExpressions) {
        detections = await faceapi
          .detectAllFaces(input, options)
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withFaceExpressions() as any;
      }

      if (config.detectAge || config.detectGender) {
        detections = await faceapi
          .detectAllFaces(input, options)
          .withFaceLandmarks()
          .withFaceDescriptors()
          .withAgeAndGender() as any;
      }

      const faces: FaceDetection[] = detections
        .slice(0, config.maxFaces)
        .filter(d => d.detection.score >= config.minConfidence)
        .map((d: any, i: number) => ({
          id: `face-${Date.now()}-${i}`,
          box: {
            x: d.detection.box.x,
            y: d.detection.box.y,
            width: d.detection.box.width,
            height: d.detection.box.height,
          },
          landmarks: d.landmarks,
          descriptor: d.descriptor,
          expressions: d.expressions ? {
            neutral: d.expressions.neutral,
            happy: d.expressions.happy,
            sad: d.expressions.sad,
            angry: d.expressions.angry,
            fearful: d.expressions.fearful,
            disgusted: d.expressions.disgusted,
            surprised: d.expressions.surprised,
          } : undefined,
          age: d.age,
          gender: d.gender,
          genderProbability: d.genderProbability,
        }));

      onFaceDetected?.(faces);
      return faces;
    } catch (err: any) {
      console.error('[FaceAPI] Erro na detecção:', err);
      return [];
    }
  }, [modelsLoaded, config, onFaceDetected]);

  // Detectar único rosto
  const detectSingleFace = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection | null> => {
    const faces = await detectFaces(input);
    return faces.length > 0 ? faces[0] : null;
  }, [detectFaces]);

  // Comparar com rostos cadastrados
  const matchFace = useCallback(async (descriptor: Float32Array): Promise<FaceMatch | null> => {
    if (!faceMatcher.current) {
      return null;
    }

    try {
      const bestMatch = faceMatcher.current.findBestMatch(descriptor);
      const personId = bestMatch.label;
      
      if (personId === 'unknown') {
        return {
          personId: 'unknown',
          personName: 'Desconhecido',
          distance: bestMatch.distance,
          similarity: 1 - bestMatch.distance,
          isMatch: false,
          status: 'unknown',
        };
      }

      const registeredFace = registeredFaces.find(f => f.personId === personId);
      
      const match: FaceMatch = {
        personId,
        personName: registeredFace?.personName || personId,
        distance: bestMatch.distance,
        similarity: 1 - bestMatch.distance,
        isMatch: bestMatch.distance < config.matchThreshold,
        status: (registeredFace?.status as any) || 'known',
        photoUrl: registeredFace?.photoUrl,
      };

      return match;
    } catch (err) {
      console.error('[FaceAPI] Erro no matching:', err);
      return null;
    }
  }, [registeredFaces, config.matchThreshold]);

  // Comparar todos os rostos detectados
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

  // Registrar novo rosto
  const registerFace = useCallback(async (
    personId: string,
    personName: string,
    descriptor: Float32Array,
    status: string = 'active'
  ): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('registered_persons')
        .update({
          face_encoding: Array.from(descriptor),
        })
        .eq('id', personId);

      if (dbError) throw dbError;

      const newFace: RegisteredFace = {
        id: `face-${personId}`,
        personId,
        personName,
        descriptor: Array.from(descriptor),
        status: status as any,
      };

      setRegisteredFaces(prev => {
        const filtered = prev.filter(f => f.personId !== personId);
        return [...filtered, newFace];
      });

      await loadRegisteredFaces();

      toast.success(`Rosto de ${personName} cadastrado com sucesso`);
      return true;
    } catch (err: any) {
      toast.error(`Erro ao cadastrar rosto: ${err.message}`);
      return false;
    }
  }, [loadRegisteredFaces]);

  // Extrair descriptor de uma imagem/vídeo
  const extractDescriptor = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array | null> => {
    const face = await detectSingleFace(input);
    return face?.descriptor || null;
  }, [detectSingleFace]);

  // Calcular similaridade entre dois descriptors
  const calculateSimilarity = useCallback((
    descriptor1: Float32Array,
    descriptor2: Float32Array
  ): number => {
    const distance = faceapi.euclideanDistance(descriptor1, descriptor2);
    return Math.max(0, 1 - distance);
  }, []);

  // Desenhar detecções no canvas
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

      // Cor baseada no status
      let color = '#3b82f6'; // azul = desconhecido
      let label = 'Desconhecido';

      if (match) {
        if (match.status === 'blacklist') {
          color = '#ef4444'; // vermelho
          label = `⚠️ ${match.personName}`;
        } else if (match.status === 'vip') {
          color = '#22c55e'; // verde
          label = `⭐ ${match.personName}`;
        } else if (match.isMatch) {
          color = '#22c55e'; // verde
          label = match.personName;
        }
      }

      // Desenhar box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Desenhar label
      ctx.fillStyle = color;
      ctx.font = '14px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      ctx.fillRect(x, y - 22, textWidth + 10, 22);

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 5, y - 6);

      // Desenhar similaridade
      if (match && match.isMatch) {
        const similarity = `${(match.similarity * 100).toFixed(0)}%`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y + height, 50, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(similarity, x + 5, y + height + 13);
      }

      // Desenhar landmarks (pontos faciais)
      if (face.landmarks) {
        ctx.fillStyle = color;
        const positions = face.landmarks.positions;
        positions.forEach(pt => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });
  }, []);

  // Atualizar config
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
