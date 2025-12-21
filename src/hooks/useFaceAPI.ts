/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceAPI (IMPLEMENTAÇÃO REAL)
 * 
 * Detecção facial REAL usando face-api.js:
 * - Carregamento de modelos reais
 * - Detecção de rostos em tempo real
 * - Extração de face descriptors (128D vectors)
 * - Comparação com rostos cadastrados
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
  expressions?: faceapi.FaceExpressions;
  age?: number;
  gender?: string;
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
  status: string;
  photoUrl?: string;
}

export interface FaceAPIConfig {
  modelPath: string;
  minConfidence: number;
  matchThreshold: number;
  inputSize: 160 | 224 | 320 | 416 | 512 | 608;
  detectExpressions: boolean;
  detectAge: boolean;
  maxFaces: number;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const DEFAULT_CONFIG: FaceAPIConfig = {
  modelPath: 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights',
  minConfidence: 0.5,
  matchThreshold: 0.6,
  inputSize: 416,
  detectExpressions: false,
  detectAge: false,
  maxFaces: 10,
};

// ============================================
// SINGLETON PARA CACHE DE MODELOS
// ============================================

class FaceAPICache {
  private static instance: FaceAPICache;
  private modelsLoaded = false;
  private faceMatcher: faceapi.FaceMatcher | null = null;
  private registeredFaces: RegisteredFace[] = [];

  static getInstance(): FaceAPICache {
    if (!FaceAPICache.instance) {
      FaceAPICache.instance = new FaceAPICache();
    }
    return FaceAPICache.instance;
  }

  async loadModels(modelPath: string, options: { expressions: boolean; age: boolean }): Promise<void> {
    if (this.modelsLoaded) return;

    console.log('[FaceAPI] Carregando modelos de', modelPath);

    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
        faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
        ...(options.expressions ? [faceapi.nets.faceExpressionNet.loadFromUri(modelPath)] : []),
        ...(options.age ? [faceapi.nets.ageGenderNet.loadFromUri(modelPath)] : []),
      ]);

      this.modelsLoaded = true;
      console.log('[FaceAPI] Modelos carregados com sucesso');
    } catch (err) {
      console.error('[FaceAPI] Erro ao carregar modelos:', err);
      throw err;
    }
  }

  isLoaded(): boolean {
    return this.modelsLoaded;
  }

  async loadRegisteredFaces(): Promise<RegisteredFace[]> {
    try {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, photo_url, status, face_encoding')
        .not('face_encoding', 'is', null);

      if (error) throw error;

      this.registeredFaces = (data || [])
        .filter(p => p.face_encoding && Array.isArray(p.face_encoding) && p.face_encoding.length === 128)
        .map(person => ({
          id: `face-${person.id}`,
          personId: person.id,
          personName: person.name,
          descriptor: person.face_encoding,
          status: person.status || 'active',
          photoUrl: person.photo_url,
        }));

      // Criar FaceMatcher
      if (this.registeredFaces.length > 0) {
        const labeledDescriptors = this.registeredFaces.map(face =>
          new faceapi.LabeledFaceDescriptors(
            face.personId,
            [new Float32Array(face.descriptor)]
          )
        );
        this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.6);
      }

      console.log(`[FaceAPI] ${this.registeredFaces.length} rostos cadastrados carregados`);
      return this.registeredFaces;
    } catch (err) {
      console.error('[FaceAPI] Erro ao carregar rostos:', err);
      return [];
    }
  }

  getRegisteredFaces(): RegisteredFace[] {
    return this.registeredFaces;
  }

  getFaceMatcher(): faceapi.FaceMatcher | null {
    return this.faceMatcher;
  }

  updateMatcher(threshold: number): void {
    if (this.registeredFaces.length > 0) {
      const labeledDescriptors = this.registeredFaces.map(face =>
        new faceapi.LabeledFaceDescriptors(
          face.personId,
          [new Float32Array(face.descriptor)]
        )
      );
      this.faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, threshold);
    }
  }
}

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
  loadModels: () => Promise<void>;
  detectFaces: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetection[]>;
  detectSingleFace: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<FaceDetection | null>;
  matchFace: (descriptor: Float32Array) => FaceMatch | null;
  matchAllFaces: (detections: FaceDetection[]) => Map<string, FaceMatch>;
  registerFace: (personId: string, personName: string, descriptor: Float32Array) => Promise<boolean>;
  loadRegisteredFaces: () => Promise<void>;
  extractDescriptor: (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => Promise<Float32Array | null>;
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

  const cache = useRef(FaceAPICache.getInstance());

  // Carregar modelos
  const loadModels = useCallback(async () => {
    if (cache.current.isLoaded()) {
      setModelsLoaded(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cache.current.loadModels(config.modelPath, {
        expressions: config.detectExpressions,
        age: config.detectAge,
      });

      setModelsLoaded(true);
    } catch (err: any) {
      const message = `Erro ao carregar modelos: ${err.message}`;
      setError(message);
      onError?.(err);
    } finally {
      setLoading(false);
    }
  }, [config.modelPath, config.detectExpressions, config.detectAge, onError]);

  // Auto load
  useEffect(() => {
    if (autoLoadModels) {
      loadModels();
    }
  }, [autoLoadModels, loadModels]);

  // Carregar rostos cadastrados
  const loadRegisteredFaces = useCallback(async () => {
    const faces = await cache.current.loadRegisteredFaces();
    setRegisteredFaces(faces);
  }, []);

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
    if (!cache.current.isLoaded()) {
      console.warn('[FaceAPI] Modelos não carregados');
      return [];
    }

    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: config.inputSize,
        scoreThreshold: config.minConfidence,
      });

      let query = faceapi
        .detectAllFaces(input, options)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (config.detectExpressions) {
        query = query.withFaceExpressions() as any;
      }

      if (config.detectAge) {
        query = query.withAgeAndGender() as any;
      }

      const detections = await query;

      const faces: FaceDetection[] = detections
        .slice(0, config.maxFaces)
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
          expressions: d.expressions,
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
  }, [config, onFaceDetected]);

  // Detectar único rosto
  const detectSingleFace = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<FaceDetection | null> => {
    const faces = await detectFaces(input);
    return faces.length > 0 ? faces[0] : null;
  }, [detectFaces]);

  // Comparar com rostos cadastrados
  const matchFace = useCallback((descriptor: Float32Array): FaceMatch | null => {
    const matcher = cache.current.getFaceMatcher();
    if (!matcher) return null;

    const bestMatch = matcher.findBestMatch(descriptor);
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

    const registeredFace = cache.current.getRegisteredFaces().find(f => f.personId === personId);

    return {
      personId,
      personName: registeredFace?.personName || personId,
      distance: bestMatch.distance,
      similarity: 1 - bestMatch.distance,
      isMatch: bestMatch.distance < config.matchThreshold,
      status: (registeredFace?.status as any) || 'known',
      photoUrl: registeredFace?.photoUrl,
    };
  }, [config.matchThreshold]);

  // Comparar todos os rostos detectados
  const matchAllFaces = useCallback((detections: FaceDetection[]): Map<string, FaceMatch> => {
    const matches = new Map<string, FaceMatch>();

    for (const face of detections) {
      if (face.descriptor) {
        const match = matchFace(face.descriptor);
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
    descriptor: Float32Array
  ): Promise<boolean> => {
    try {
      const { error: dbError } = await supabase
        .from('registered_persons')
        .update({ face_encoding: Array.from(descriptor) })
        .eq('id', personId);

      if (dbError) throw dbError;

      await loadRegisteredFaces();
      toast.success(`Rosto de ${personName} cadastrado com sucesso`);
      return true;
    } catch (err: any) {
      toast.error(`Erro ao cadastrar rosto: ${err.message}`);
      return false;
    }
  }, [loadRegisteredFaces]);

  // Extrair descriptor
  const extractDescriptor = useCallback(async (
    input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
  ): Promise<Float32Array | null> => {
    const face = await detectSingleFace(input);
    return face?.descriptor || null;
  }, [detectSingleFace]);

  // Desenhar detecções
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

      // Similaridade
      if (match?.isMatch) {
        const similarity = `${(match.similarity * 100).toFixed(0)}%`;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x, y + height, 50, 18);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(similarity, x + 5, y + height + 13);
      }
    });
  }, []);

  // Atualizar config
  const updateConfig = useCallback((updates: Partial<FaceAPIConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      if (updates.matchThreshold) {
        cache.current.updateMatcher(updates.matchThreshold);
      }
      return newConfig;
    });
  }, []);

  return {
    modelsLoaded,
    loading,
    error,
    registeredFaces,
    loadModels,
    detectFaces,
    detectSingleFace,
    matchFace,
    matchAllFaces,
    registerFace,
    loadRegisteredFaces,
    extractDescriptor,
    drawDetections,
    config,
    updateConfig,
  };
}

export default useFaceAPI;

