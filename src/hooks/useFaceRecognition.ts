/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useFaceRecognition
 * 
 * Motor de reconhecimento facial com:
 * - Detecção de faces via IA
 * - Matching com pessoas cadastradas
 * - Geração de alertas automáticos
 * - Logs de reconhecimento
 * 
 * @example
 * const {
 *   detectFaces,
 *   recognizePerson,
 *   isProcessing,
 *   lastResult,
 * } = useFaceRecognition({
 *   cameraId: 'cam-001',
 *   onPersonRecognized: (result) => handleRecognition(result),
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Person,
  PersonStatus,
  DetectedFace,
  FaceMatch,
  RecognitionResult,
  FaceRecognitionConfig,
  RecognitionLog,
  FaceRecognitionEvents,
  FaceRecognitionStats,
  ListType,
  defaultFaceRecognitionConfig,
  calculateSimilarity,
  meetsQualityThreshold,
  determineAction,
  isWithinAccessSchedule,
} from '@/types/faceRecognition';
import { toast } from 'sonner';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseFaceRecognitionOptions extends FaceRecognitionEvents {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName?: string;
  
  /** Configuração */
  config?: Partial<FaceRecognitionConfig>;
  
  /** Pessoas cadastradas (pré-carregadas) */
  registeredPersons?: Person[];
  
  /** Criar alertas no banco */
  createAlerts?: boolean;
  
  /** Salvar logs no banco */
  saveLogs?: boolean;
  
  /** Intervalo mínimo entre processamentos (ms) */
  throttleInterval?: number;
}

interface UseFaceRecognitionReturn {
  /** Está processando */
  isProcessing: boolean;
  
  /** Último resultado */
  lastResult: RecognitionResult | null;
  
  /** Faces detectadas no último frame */
  detectedFaces: DetectedFace[];
  
  /** Estatísticas */
  stats: FaceRecognitionStats;
  
  /** Logs recentes */
  recentLogs: RecognitionLog[];
  
  /** Detectar faces em uma imagem */
  detectFaces: (imageBase64: string) => Promise<DetectedFace[]>;
  
  /** Reconhecer pessoa(s) em uma imagem */
  recognizeFaces: (imageBase64: string) => Promise<RecognitionResult[]>;
  
  /** Processar frame (detectar + reconhecer) */
  processFrame: (imageBase64: string) => Promise<RecognitionResult[]>;
  
  /** Cadastrar nova pessoa */
  registerPerson: (person: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'recognitionCount'>) => Promise<Person>;
  
  /** Adicionar foto de treinamento */
  addTrainingPhoto: (personId: string, photoBase64: string) => Promise<void>;
  
  /** Buscar pessoas cadastradas */
  fetchPersons: () => Promise<Person[]>;
  
  /** Atualizar configuração */
  updateConfig: (updates: Partial<FaceRecognitionConfig>) => void;
  
  /** Limpar estatísticas */
  resetStats: () => void;
  
  /** Erro atual */
  error: string | null;
}

// ============================================
// ESTATÍSTICAS INICIAIS
// ============================================

const initialStats: FaceRecognitionStats = {
  totalDetections: 0,
  recognizedCount: 0,
  unknownCount: 0,
  alertsGenerated: 0,
  byListType: {
    whitelist: 0,
    blacklist: 0,
    vip: 0,
    employee: 0,
    visitor: 0,
    contractor: 0,
    unknown: 0,
  },
  byCamera: {},
  recognitionRate: 0,
  avgProcessingTime: 0,
};

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useFaceRecognition(
  options: UseFaceRecognitionOptions
): UseFaceRecognitionReturn {
  const {
    cameraId,
    cameraName = 'Câmera',
    config: initialConfig,
    registeredPersons: initialPersons,
    createAlerts = true,
    saveLogs = true,
    throttleInterval = 1000,
    onFaceDetected,
    onPersonRecognized,
    onUnknownPerson,
    onAlert,
    onAccessDenied,
    onVIPDetected,
    onBlacklistDetected,
    onError,
  } = options;

  // Estado
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<RecognitionResult | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<DetectedFace[]>([]);
  const [stats, setStats] = useState<FaceRecognitionStats>(initialStats);
  const [recentLogs, setRecentLogs] = useState<RecognitionLog[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const configRef = useRef<FaceRecognitionConfig>({
    ...defaultFaceRecognitionConfig,
    ...initialConfig,
    cameraId,
  });
  const personsRef = useRef<Person[]>(initialPersons || []);
  const lastProcessTimeRef = useRef<number>(0);
  const alertCooldownsRef = useRef<Map<string, number>>(new Map());
  const processingTimesRef = useRef<number[]>([]);

  // ============================================
  // CARREGAR PESSOAS DO BANCO
  // ============================================

  const fetchPersons = useCallback(async (): Promise<Person[]> => {
    try {
      const { data, error: queryError } = await supabase
        .from('registered_persons')
        .select('*')
        .eq('is_active', true);

      if (queryError) throw queryError;

      const persons: Person[] = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        role: row.role || undefined,
        department: row.department || undefined,
        faceEncoding: Array.isArray(row.face_encoding) ? (row.face_encoding as number[]) : [],
        photoUrl: row.photo_url || undefined,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        listType: 'employee' as ListType,
        status: 'active' as PersonStatus,
        trainingPhotos: [],
        recognitionCount: 0,
      }));

      personsRef.current = persons;
      return persons;
    } catch (err) {
      
      return [];
    }
  }, []);

  // ============================================
  // DETECTAR FACES (via IA)
  // ============================================

  const detectFaces = useCallback(async (
    imageBase64: string
  ): Promise<DetectedFace[]> => {
    try {
      const { data, error: apiError } = await supabase.functions.invoke('detect-faces', {
        body: { imageBase64 },
      });

      if (apiError) throw apiError;
      if (!data.success) throw new Error(data.error);

      const faces: DetectedFace[] = (data.faces || []).map((f: unknown, index: number) => ({
        id: `face-${Date.now()}-${index}`,
        boundingBox: f.boundingBox || f.bounding_box || { x: 0, y: 0, width: 10, height: 10 },
        confidence: f.confidence || 0.9,
        landmarks: f.landmarks,
        encoding: f.encoding,
        quality: f.quality || 0.8,
        attributes: f.attributes,
        pose: f.pose,
        croppedImage: f.croppedImage || f.cropped_image,
        timestamp: new Date(),
      }));

      setDetectedFaces(faces);

      // Notificar detecção
      faces.forEach(face => {
        onFaceDetected?.(face, cameraId);
      });

      return faces;
    } catch (err) {
      
      throw err;
    }
  }, [cameraId, onFaceDetected]);

  // ============================================
  // FAZER MATCHING COM PESSOAS CADASTRADAS
  // ============================================

  const matchFace = useCallback((face: DetectedFace): FaceMatch[] => {
    if (!face.encoding || face.encoding.length === 0) {
      return [];
    }

    const config = configRef.current;
    const matches: FaceMatch[] = [];

    for (const person of personsRef.current) {
      if (!person.faceEncoding || person.faceEncoding.length === 0) continue;

      const similarity = calculateSimilarity(face.encoding, person.faceEncoding);
      const isMatch = similarity >= config.matchThreshold;

      matches.push({
        personId: person.id,
        personName: person.name,
        personPhoto: person.photoUrl,
        listType: person.listType,
        similarity,
        isMatch,
        distance: 1 - similarity,
      });
    }

    // Ordenar por similaridade (maior primeiro)
    matches.sort((a, b) => b.similarity - a.similarity);

    return matches;
  }, []);

  // ============================================
  // PROCESSAR RESULTADO DE RECONHECIMENTO
  // ============================================

  const processRecognitionResult = useCallback(async (
    face: DetectedFace,
    matches: FaceMatch[]
  ): Promise<RecognitionResult> => {
    const config = configRef.current;
    const bestMatch = matches.find(m => m.isMatch);
    const isKnown = !!bestMatch;

    let action: RecognitionResult['action'] = 'none';
    let shouldAlert = false;
    let alertSeverity: RecognitionResult['alertSeverity'];
    let message: string | undefined;

    if (isKnown && bestMatch) {
      // Pessoa conhecida
      const person = personsRef.current.find(p => p.id === bestMatch.personId);
      
      if (person) {
        action = determineAction(person.listType, config);

        // Verificar horário de acesso
        if (config.checkAccessSchedule && !isWithinAccessSchedule(person)) {
          action = 'alert';
          shouldAlert = true;
          alertSeverity = 'medium';
          message = `${person.name} detectado fora do horário de acesso`;
          onAccessDenied?.({ face, matches, bestMatch, isKnown, action, shouldAlert, message }, cameraId, 'Fora do horário');
        }

        // Verificar câmera permitida
        if (config.checkAllowedCameras && person.allowedCameras?.length) {
          if (!person.allowedCameras.includes(cameraId)) {
            action = 'alert';
            shouldAlert = true;
            alertSeverity = 'medium';
            message = `${person.name} detectado em área não permitida`;
            onAccessDenied?.({ face, matches, bestMatch, isKnown, action, shouldAlert, message }, cameraId, 'Área restrita');
          }
        }

        // Verificar tipo de lista
        if (person.listType === 'blacklist') {
          shouldAlert = true;
          alertSeverity = 'critical';
          message = `ALERTA: ${person.name} (bloqueado) detectado`;
          onBlacklistDetected?.({ face, matches, bestMatch, isKnown, action, shouldAlert, alertSeverity, message }, cameraId);
        } else if (person.listType === 'vip') {
          if (action === 'alert' || config.actions.vip === 'notify') {
            shouldAlert = true;
            alertSeverity = 'low';
            message = `VIP detectado: ${person.name}`;
          }
          onVIPDetected?.({ face, matches, bestMatch, isKnown, action, shouldAlert, message }, cameraId);
        }

        // Atualizar último acesso da pessoa
        await supabase
          .from('registered_persons')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', person.id);
      }
    } else {
      // Pessoa desconhecida
      if (config.alertOnUnknown) {
        action = 'alert';
        shouldAlert = true;
        alertSeverity = 'medium';
        message = 'Pessoa não identificada detectada';
      } else {
        action = 'log';
      }

      onUnknownPerson?.(face, cameraId);
    }

    // Verificar cooldown de alertas
    if (shouldAlert && bestMatch) {
      const cooldownKey = `${cameraId}-${bestMatch.personId}`;
      const lastAlertTime = alertCooldownsRef.current.get(cooldownKey) || 0;
      const now = Date.now();

      if (now - lastAlertTime < config.alertCooldown * 1000) {
        shouldAlert = false;
      } else {
        alertCooldownsRef.current.set(cooldownKey, now);
      }
    }

    const result: RecognitionResult = {
      face,
      matches,
      bestMatch,
      isKnown,
      action,
      message,
      shouldAlert,
      alertSeverity,
    };

    // Criar alerta se necessário
    if (shouldAlert && createAlerts) {
      await supabase.from('alerts').insert({
        camera_name: cameraName,
        type: 'access',
        severity: alertSeverity || 'medium',
        message: message || 'Reconhecimento facial',
        is_read: false,
      });

      onAlert?.(result, cameraId);
    }

    // Salvar log de reconhecimento
    if (saveLogs) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('recognition_logs').insert({
            camera_id: cameraId,
            person_id: bestMatch?.personId,
            user_id: user.id,
            confidence: bestMatch?.similarity,
            recognized: isKnown,
            timestamp: new Date().toISOString(),
            image_url: face.croppedImage,
          });
        }
      } catch (logErr) {
        
      }

      const log: Partial<RecognitionLog> = {
        id: crypto.randomUUID(),
        cameraId,
        cameraName,
        personId: bestMatch?.personId,
        personName: bestMatch?.personName,
        listType: bestMatch?.listType,
        similarity: bestMatch?.similarity,
        isKnown,
        action,
        faceSnapshot: face.croppedImage,
        boundingBox: face.boundingBox,
        attributes: face.attributes,
        alertGenerated: shouldAlert,
        timestamp: new Date(),
      };

      setRecentLogs(prev => [log as RecognitionLog, ...prev.slice(0, 49)]);
    }

    // Notificar
    if (isKnown) {
      onPersonRecognized?.(result, cameraId);
    }

    return result;
  }, [cameraId, cameraName, createAlerts, saveLogs, onAlert, onPersonRecognized, onUnknownPerson, onAccessDenied, onBlacklistDetected, onVIPDetected]);

  // ============================================
  // RECONHECER FACES
  // ============================================

  const recognizeFaces = useCallback(async (
    imageBase64: string
  ): Promise<RecognitionResult[]> => {
    const startTime = Date.now();
    const config = configRef.current;

    if (!config.enabled) return [];

    // Throttle
    if (Date.now() - lastProcessTimeRef.current < throttleInterval) {
      return [];
    }
    lastProcessTimeRef.current = Date.now();

    setIsProcessing(true);
    setError(null);

    try {
      // Detectar faces
      const faces = await detectFaces(imageBase64);

      if (faces.length === 0) {
        setIsProcessing(false);
        return [];
      }

      // Limitar número de faces
      const facesToProcess = faces
        .filter(f => meetsQualityThreshold(f, config))
        .slice(0, config.maxFacesPerFrame);

      const results: RecognitionResult[] = [];

      // Processar cada face
      for (const face of facesToProcess) {
        const matches = matchFace(face);
        const result = await processRecognitionResult(face, matches);
        results.push(result);
      }

      // Atualizar estatísticas
      const processingTime = Date.now() - startTime;
      processingTimesRef.current.push(processingTime);
      if (processingTimesRef.current.length > 100) {
        processingTimesRef.current.shift();
      }

      setStats(prev => {
        const newStats = { ...prev };
        newStats.totalDetections += facesToProcess.length;
        
        results.forEach(r => {
          if (r.isKnown && r.bestMatch) {
            newStats.recognizedCount++;
            newStats.byListType[r.bestMatch.listType]++;
          } else {
            newStats.unknownCount++;
            newStats.byListType.unknown++;
          }
          if (r.shouldAlert) {
            newStats.alertsGenerated++;
          }
        });

        newStats.byCamera[cameraId] = (newStats.byCamera[cameraId] || 0) + facesToProcess.length;
        newStats.recognitionRate = newStats.totalDetections > 0
          ? (newStats.recognizedCount / newStats.totalDetections) * 100
          : 0;
        newStats.avgProcessingTime = processingTimesRef.current.reduce((a, b) => a + b, 0) / processingTimesRef.current.length;

        return newStats;
      });

      // Atualizar último resultado
      if (results.length > 0) {
        setLastResult(results[0]);
      }

      return results;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro no reconhecimento';
      setError(errorMsg);
      onError?.(err instanceof Error ? err : new Error(errorMsg), cameraId);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [cameraId, throttleInterval, detectFaces, matchFace, processRecognitionResult, onError]);

  // ============================================
  // PROCESSAR FRAME (atalho)
  // ============================================

  const processFrame = useCallback(async (
    imageBase64: string
  ): Promise<RecognitionResult[]> => {
    return recognizeFaces(imageBase64);
  }, [recognizeFaces]);

  // ============================================
  // CADASTRAR PESSOA (desabilitado - tabela registered_persons não existe)
  // ============================================

  const registerPerson = useCallback(async (
    personData: Omit<Person, 'id' | 'createdAt' | 'updatedAt' | 'recognitionCount'>
  ): Promise<Person> => {
    // Nota: tabela registered_persons não existe no schema atual
    // Funcionalidade de cadastro desabilitada
    throw new Error('Funcionalidade não disponível - tabela registered_persons não existe');
  }, []);

  // ============================================
  // ADICIONAR FOTO DE TREINAMENTO (desabilitado)
  // ============================================

  const addTrainingPhoto = useCallback(async (
    personId: string,
    photoBase64: string
  ): Promise<void> => {
    // Nota: tabela registered_persons não existe no schema atual
    throw new Error('Funcionalidade não disponível - tabela registered_persons não existe');
  }, []);

  // ============================================
  // OUTROS MÉTODOS
  // ============================================

  const updateConfig = useCallback((updates: Partial<FaceRecognitionConfig>) => {
    configRef.current = { ...configRef.current, ...updates };
  }, []);

  const resetStats = useCallback(() => {
    setStats(initialStats);
    processingTimesRef.current = [];
  }, []);

  // ============================================
  // EFEITOS
  // ============================================

  // Carregar pessoas ao montar
  useEffect(() => {
    if (!initialPersons) {
      fetchPersons().catch(
    }
  }, [fetchPersons, initialPersons]);

  // ============================================
  // RETORNO
  // ============================================

  return {
    isProcessing,
    lastResult,
    detectedFaces,
    stats,
    recentLogs,
    detectFaces,
    recognizeFaces,
    processFrame,
    registerPerson,
    addTrainingPhoto,
    fetchPersons,
    updateConfig,
    resetStats,
    error,
  };
}

export default useFaceRecognition;
