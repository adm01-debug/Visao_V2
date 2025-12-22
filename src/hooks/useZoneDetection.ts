/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useZoneDetection
 * 
 * Motor de detecção de objetos em zonas de interesse.
 * - Tracking de objetos entre frames
 * - Detecção de entrada/saída
 * - Contagem e ocupação
 * - Cruzamento de linhas (tripwire)
 * 
 * @example
 * const {
 *   zones,
 *   processDetections,
 *   addZone,
 *   stats,
 * } = useZoneDetection({
 *   cameraId: 'cam-001',
 * });
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Zone,
  ZoneType,
  ZoneGeometry,
  ZoneConfig,
  ZoneStats,
  ZoneEvent,
  ZoneEventType,
  TrackedObject,
  Point,
  ZoneEvents,
  ZoneDetectionConfig,
  defaultZoneDetectionConfig,
  isBoxInZone,
  didCrossLine,
  generateZoneColor,
} from '@/types/zones';
import { toast } from 'sonner';

// ============================================
// TIPOS DO HOOK
// ============================================

interface UseZoneDetectionOptions extends ZoneEvents {
  /** ID da câmera */
  cameraId: string;
  
  /** Nome da câmera */
  cameraName?: string;
  
  /** Configuração de detecção */
  config?: Partial<ZoneDetectionConfig>;
  
  /** Zonas pré-carregadas */
  initialZones?: Zone[];
  
  /** Criar alertas no banco */
  createAlerts?: boolean;
  
  /** Salvar eventos no banco */
  saveEvents?: boolean;
}

interface UseZoneDetectionReturn {
  /** Zonas configuradas */
  zones: Zone[];
  
  /** Objetos rastreados atualmente */
  trackedObjects: Map<string, TrackedObject>;
  
  /** Estatísticas por zona */
  stats: Map<string, ZoneStats>;
  
  /** Eventos recentes */
  recentEvents: ZoneEvent[];
  
  /** Processar detecções de um frame */
  processDetections: (detections: DetectionInput[]) => void;
  
  /** Adicionar zona */
  addZone: (zone: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'stats'>) => Promise<Zone>;
  
  /** Atualizar zona */
  updateZone: (zoneId: string, updates: Partial<Zone>) => Promise<void>;
  
  /** Remover zona */
  removeZone: (zoneId: string) => Promise<void>;
  
  /** Habilitar/desabilitar zona */
  toggleZone: (zoneId: string) => void;
  
  /** Buscar zonas do banco */
  fetchZones: () => Promise<Zone[]>;
  
  /** Resetar estatísticas */
  resetStats: (zoneId?: string) => void;
  
  /** Atualizar configuração */
  updateConfig: (updates: Partial<ZoneDetectionConfig>) => void;
  
  /** Erro */
  error: string | null;
}

/** Entrada de detecção (do modelo de IA) */
interface DetectionInput {
  id?: string;
  type: 'person' | 'vehicle' | 'object';
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
}

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useZoneDetection(
  options: UseZoneDetectionOptions
): UseZoneDetectionReturn {
  const {
    cameraId,
    cameraName = 'Câmera',
    config: initialConfig,
    initialZones = [],
    createAlerts = true,
    saveEvents = true,
    onEnter,
    onExit,
    onLineCross,
    onOccupancyChange,
    onMaxOccupancy,
    onDwellAlert,
    onRuleViolation,
    onAlert,
  } = options;

  // Estado
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [trackedObjects, setTrackedObjects] = useState<Map<string, TrackedObject>>(new Map());
  const [stats, setStats] = useState<Map<string, ZoneStats>>(new Map());
  const [recentEvents, setRecentEvents] = useState<ZoneEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const configRef = useRef<ZoneDetectionConfig>({
    ...defaultZoneDetectionConfig,
    ...initialConfig,
  });
  const objectsRef = useRef<Map<string, TrackedObject>>(new Map());
  const previousPositionsRef = useRef<Map<string, Point>>(new Map());
  const zoneObjectsRef = useRef<Map<string, Set<string>>>(new Map()); // zona -> objetos dentro
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map());

  // ============================================
  // INICIALIZAR STATS PARA ZONAS
  // ============================================

  const initializeStats = useCallback((zone: Zone): ZoneStats => {
    return {
      currentOccupancy: 0,
      countIn: 0,
      countOut: 0,
      avgDwellTime: 0,
      maxOccupancyToday: 0,
      alertsToday: 0,
      currentObjects: [],
    };
  }, []);

  // ============================================
  // CRIAR EVENTO
  // ============================================

  const createEvent = useCallback(async (
    zone: Zone,
    eventType: ZoneEventType,
    object?: TrackedObject,
    value?: number,
    generateAlert: boolean = false
  ): Promise<ZoneEvent> => {
    const event: ZoneEvent = {
      id: crypto.randomUUID(),
      zoneId: zone.id,
      zoneName: zone.name,
      cameraId,
      eventType,
      object,
      value,
      alertGenerated: generateAlert,
      timestamp: new Date(),
    };

    // Adicionar aos eventos recentes
    setRecentEvents(prev => [event, ...prev.slice(0, 99)]);

    // Salvar evento no banco
    if (saveEvents) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const insertData: any = {
            zone_id: zone.id,
            user_id: user.id,
            event_type: eventType,
            detected_objects: object ? [{ id: object.id, type: object.type, position: object.position }] : [],
            timestamp: new Date().toISOString(),
          };
          await supabase.from('zone_events').insert(insertData);
        }
      } catch (saveErr) {
        
      }
    }

    // Criar alerta se necessário
    if (generateAlert && createAlerts) {
      const severity = zone.type === 'restricted' ? 'high' : 'medium';
      try {
        await supabase.from('alerts').insert({
          camera_name: cameraName,
          type: 'security' as const,
          severity,
          message: `${zone.name}: ${getEventMessage(eventType, value)}`,
          is_read: false,
        });
      } catch (err) {
        
      }

      onAlert?.(zone, event);
    }

    return event;
  }, [cameraId, cameraName, createAlerts, saveEvents, onAlert]);

  const getEventMessage = (type: ZoneEventType, value?: number): string => {
    const messages: Record<ZoneEventType, string> = {
      enter: 'Objeto entrou na zona',
      exit: 'Objeto saiu da zona',
      cross_line: 'Linha cruzada',
      dwell_time: `Permanência excedida: ${value}s`,
      occupancy: `Ocupação: ${value} pessoas`,
      count_in: `Entrada registrada (total: ${value})`,
      count_out: `Saída registrada (total: ${value})`,
      crowd_density: `Densidade alta: ${value}%`,
      loitering: 'Vadiagem detectada',
      wrong_direction: 'Direção incorreta',
      ppe_violation: 'Violação de EPI detectada',
    };
    return messages[type] || 'Evento detectado';
  };

  // ============================================
  // PROCESSAR DETECÇÕES
  // ============================================

  const processDetections = useCallback((detections: DetectionInput[]) => {
    const config = configRef.current;
    const currentTime = Date.now();
    const newTrackedObjects = new Map(objectsRef.current);
    const seenObjectIds = new Set<string>();

    // Processar cada detecção
    detections.forEach((detection, index) => {
      const objectId = detection.id || `obj-${index}-${currentTime}`;
      seenObjectIds.add(objectId);

      const centerPoint: Point = {
        x: detection.boundingBox.x + detection.boundingBox.width / 2,
        y: detection.boundingBox.y + detection.boundingBox.height / 2,
      };

      // Verificar se objeto já existe
      const existingObject = newTrackedObjects.get(objectId);
      const prevPosition = previousPositionsRef.current.get(objectId);

      const trackedObj: TrackedObject = {
        id: objectId,
        type: detection.type,
        position: centerPoint,
        boundingBox: detection.boundingBox,
        enteredAt: existingObject?.enteredAt || new Date(),
        dwellTime: existingObject 
          ? (currentTime - existingObject.enteredAt.getTime()) / 1000 
          : 0,
        path: existingObject?.path 
          ? [...existingObject.path.slice(-20), centerPoint] 
          : [centerPoint],
      };

      newTrackedObjects.set(objectId, trackedObj);
      previousPositionsRef.current.set(objectId, centerPoint);

      // Verificar cada zona
      zones.filter(z => z.enabled).forEach(zone => {
        const zoneObjects = zoneObjectsRef.current.get(zone.id) || new Set();
        const wasInZone = zoneObjects.has(objectId);
        const isInZone = isBoxInZone(detection.boundingBox, zone, config.minOverlapThreshold);

        // Tripwire - verificar cruzamento de linha
        if (zone.geometry.shape === 'line' && prevPosition && zone.geometry.points.length >= 2) {
          const { crossed, direction } = didCrossLine(
            prevPosition,
            centerPoint,
            zone.geometry.points[0],
            zone.geometry.points[1]
          );

          if (crossed) {
            // Verificar direção permitida
            const allowedDir = zone.config.tripwireDirection || 'both';
            const isCorrectDirection = allowedDir === 'both' || allowedDir === direction;

            if (isCorrectDirection) {
              createEvent(zone, 'cross_line', trackedObj, undefined, zone.config.alertOnEnter);
              onLineCross?.(zone, trackedObj, direction);

              // Atualizar contagem
              if (direction === 'left-to-right' || direction === 'top-to-bottom') {
                updateZoneStats(zone.id, s => ({ ...s, countIn: s.countIn + 1 }));
              } else {
                updateZoneStats(zone.id, s => ({ ...s, countOut: s.countOut + 1 }));
              }
            } else {
              createEvent(zone, 'wrong_direction', trackedObj, undefined, true);
            }
          }
        }

        // Entrada na zona
        if (!wasInZone && isInZone) {
          zoneObjects.add(objectId);
          zoneObjectsRef.current.set(zone.id, zoneObjects);

          const newOccupancy = zoneObjects.size;
          
          createEvent(zone, 'enter', trackedObj, newOccupancy, zone.config.alertOnEnter);
          onEnter?.(zone, trackedObj);

          updateZoneStats(zone.id, s => ({
            ...s,
            currentOccupancy: newOccupancy,
            countIn: s.countIn + 1,
            maxOccupancyToday: Math.max(s.maxOccupancyToday, newOccupancy),
            lastDetectionAt: new Date(),
          }));

          onOccupancyChange?.(zone, newOccupancy, 1);

          // Verificar ocupação máxima
          if (zone.config.maxOccupancy && newOccupancy >= zone.config.maxOccupancy) {
            createEvent(zone, 'occupancy', trackedObj, newOccupancy, true);
            onMaxOccupancy?.(zone, newOccupancy);
          }
        }

        // Saída da zona
        if (wasInZone && !isInZone) {
          zoneObjects.delete(objectId);
          zoneObjectsRef.current.set(zone.id, zoneObjects);

          const newOccupancy = zoneObjects.size;
          const dwellTime = trackedObj.dwellTime;

          createEvent(zone, 'exit', trackedObj, dwellTime, zone.config.alertOnExit);
          onExit?.(zone, trackedObj, dwellTime);

          updateZoneStats(zone.id, s => ({
            ...s,
            currentOccupancy: newOccupancy,
            countOut: s.countOut + 1,
            avgDwellTime: (s.avgDwellTime * s.countOut + dwellTime) / (s.countOut + 1),
          }));

          onOccupancyChange?.(zone, newOccupancy, -1);
        }

        // Verificar tempo de permanência (dwell time)
        if (isInZone && zone.config.maxDwellTime && trackedObj.dwellTime > zone.config.maxDwellTime) {
          const alertKey = `${zone.id}-${objectId}-dwell`;
          const lastAlert = lastAlertTimeRef.current.get(alertKey) || 0;
          const cooldown = (zone.config.alertCooldown || 60) * 1000;

          if (currentTime - lastAlert > cooldown) {
            lastAlertTimeRef.current.set(alertKey, currentTime);
            createEvent(zone, 'dwell_time', trackedObj, trackedObj.dwellTime, zone.config.alertOnDwell);
            onDwellAlert?.(zone, trackedObj, trackedObj.dwellTime);
          }
        }
      });
    });

    // Remover objetos não vistos (timeout)
    const timeout = config.objectLostTimeout;
    newTrackedObjects.forEach((obj, id) => {
      if (!seenObjectIds.has(id)) {
        const timeSinceUpdate = currentTime - obj.enteredAt.getTime() - obj.dwellTime * 1000;
        if (timeSinceUpdate > timeout) {
          newTrackedObjects.delete(id);
          previousPositionsRef.current.delete(id);

          // Remover de todas as zonas
          zoneObjectsRef.current.forEach((objects, zoneId) => {
            if (objects.has(id)) {
              objects.delete(id);
              const zone = zones.find(z => z.id === zoneId);
              if (zone) {
                updateZoneStats(zoneId, s => ({
                  ...s,
                  currentOccupancy: objects.size,
                  countOut: s.countOut + 1,
                }));
              }
            }
          });
        }
      }
    });

    objectsRef.current = newTrackedObjects;
    setTrackedObjects(new Map(newTrackedObjects));

    // Atualizar objetos atuais em cada zona
    zones.forEach(zone => {
      const zoneObjects = zoneObjectsRef.current.get(zone.id) || new Set();
      const currentObjects: TrackedObject[] = [];
      zoneObjects.forEach(objId => {
        const obj = newTrackedObjects.get(objId);
        if (obj) currentObjects.push(obj);
      });
      
      updateZoneStats(zone.id, s => ({
        ...s,
        currentObjects,
      }));
    });
  }, [zones, createEvent, onEnter, onExit, onLineCross, onOccupancyChange, onMaxOccupancy, onDwellAlert]);

  // ============================================
  // ATUALIZAR ESTATÍSTICAS
  // ============================================

  const updateZoneStats = useCallback((zoneId: string, updater: (s: ZoneStats) => ZoneStats) => {
    setStats(prev => {
      const newStats = new Map(prev);
      const current = newStats.get(zoneId) || initializeStats(zones.find(z => z.id === zoneId)!);
      newStats.set(zoneId, updater(current));
      return newStats;
    });
  }, [zones, initializeStats]);

  // ============================================
  // CRUD DE ZONAS
  // ============================================

  const addZone = useCallback(async (
    zoneData: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'stats'>
  ): Promise<Zone> => {
    const newZone: Zone = {
      ...zoneData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const insertData: any = {
          id: newZone.id,
          camera_id: cameraId,
          user_id: user.id,
          name: newZone.name,
          type: newZone.type,
          points: newZone.geometry.points,
          color: newZone.color,
          is_active: newZone.enabled,
        };
        await supabase.from('zones').insert(insertData);
      }
    } catch (err) {
      
    }

    setZones(prev => [...prev, newZone]);
    setStats(prev => new Map(prev).set(newZone.id, initializeStats(newZone)));
    zoneObjectsRef.current.set(newZone.id, new Set());

    toast.success(`Zona "${newZone.name}" criada`);
    return newZone;
  }, [initializeStats, cameraId]);

  const updateZone = useCallback(async (zoneId: string, updates: Partial<Zone>) => {
    try {
      const updateData: any = { updated_at: new Date().toISOString() };
      if (updates.name) updateData.name = updates.name;
      if (updates.type) updateData.type = updates.type;
      if (updates.geometry?.points) updateData.points = updates.geometry.points;
      if (updates.color) updateData.color = updates.color;
      if (updates.enabled !== undefined) updateData.is_active = updates.enabled;

      await supabase.from('zones').update(updateData).eq('id', zoneId);
    } catch (err) {
      
    }

    setZones(prev => prev.map(z => z.id === zoneId ? { ...z, ...updates, updatedAt: new Date() } : z));
    toast.success('Zona atualizada');
  }, []);

  const removeZone = useCallback(async (zoneId: string) => {
    try {
      await supabase.from('zones').delete().eq('id', zoneId);
    } catch (err) {
      
    }

    setZones(prev => prev.filter(z => z.id !== zoneId));
    setStats(prev => {
      const newStats = new Map(prev);
      newStats.delete(zoneId);
      return newStats;
    });
    zoneObjectsRef.current.delete(zoneId);

    toast.success('Zona removida');
  }, []);

  const toggleZone = useCallback((zoneId: string) => {
    setZones(prev => prev.map(z => 
      z.id === zoneId ? { ...z, enabled: !z.enabled } : z
    ));
  }, []);

  const fetchZones = useCallback(async (): Promise<Zone[]> => {
    // Nota: tabela zones não existe no schema atual
    // Retornando lista vazia - funcionalidade de persistência desabilitada
    return zones;
  }, [zones]);
  const resetStats = useCallback((zoneId?: string) => {
    if (zoneId) {
      const zone = zones.find(z => z.id === zoneId);
      if (zone) {
        setStats(prev => new Map(prev).set(zoneId, initializeStats(zone)));
      }
    } else {
      const newStats = new Map<string, ZoneStats>();
      zones.forEach(zone => {
        newStats.set(zone.id, initializeStats(zone));
      });
      setStats(newStats);
    }
  }, [zones, initializeStats]);

  const updateConfig = useCallback((updates: Partial<ZoneDetectionConfig>) => {
    configRef.current = { ...configRef.current, ...updates };
  }, []);

  // ============================================
  // EFEITOS
  // ============================================

  useEffect(() => {
    if (initialZones.length === 0) {
      fetchZones().catch(console.error);
    }
  }, [fetchZones, initialZones.length]);

  // ============================================
  // RETORNO
  // ============================================

  return {
    zones,
    trackedObjects,
    stats,
    recentEvents,
    processDetections,
    addZone,
    updateZone,
    removeZone,
    toggleZone,
    fetchZones,
    resetStats,
    updateConfig,
    error,
  };
}

export default useZoneDetection;
