/**
 * VISÃO - useZoneDetection (Refactored)
 * Composing from zone-detection/useZoneCRUD and zone-detection/useZoneEventCreator
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Zone,
  ZoneStats,
  ZoneEvent,
  TrackedObject,
  Point,
  ZoneEvents,
  ZoneDetectionConfig,
  defaultZoneDetectionConfig,
  isBoxInZone,
  didCrossLine,
} from '@/types/zones';
import { useZoneCRUD } from './zone-detection/useZoneCRUD';
import { useZoneEventCreator } from './zone-detection/useZoneEventCreator';

interface DetectionInput {
  id?: string;
  type: 'person' | 'vehicle' | 'object';
  boundingBox: { x: number; y: number; width: number; height: number };
  confidence: number;
}

interface UseZoneDetectionOptions extends ZoneEvents {
  cameraId: string;
  cameraName?: string;
  config?: Partial<ZoneDetectionConfig>;
  initialZones?: Zone[];
  createAlerts?: boolean;
  saveEvents?: boolean;
}

export function useZoneDetection(options: UseZoneDetectionOptions) {
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
    onAlert,
  } = options;

  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [trackedObjects, setTrackedObjects] = useState<Map<string, TrackedObject>>(new Map());
  const [stats, setStats] = useState<Map<string, ZoneStats>>(new Map());
  const [recentEvents, setRecentEvents] = useState<ZoneEvent[]>([]);
  const [error] = useState<string | null>(null);

  const configRef = useRef<ZoneDetectionConfig>({
    ...defaultZoneDetectionConfig,
    ...initialConfig,
  });
  const objectsRef = useRef<Map<string, TrackedObject>>(new Map());
  const previousPositionsRef = useRef<Map<string, Point>>(new Map());
  const zoneObjectsRef = useRef<Map<string, Set<string>>>(new Map());
  const lastAlertTimeRef = useRef<Map<string, number>>(new Map());

  const initializeStats = useCallback(
    (): ZoneStats => ({
      currentOccupancy: 0,
      countIn: 0,
      countOut: 0,
      avgDwellTime: 0,
      maxOccupancyToday: 0,
      alertsToday: 0,
      currentObjects: [],
    }),
    []
  );

  const { createEvent } = useZoneEventCreator({
    cameraId,
    cameraName,
    createAlerts,
    saveEvents,
    onAlert,
    setRecentEvents,
  });

  const { addZone, updateZone, removeZone, toggleZone } = useZoneCRUD(
    cameraId,
    initializeStats as (zone: Zone) => ZoneStats,
    setZones,
    setStats,
    zoneObjectsRef
  );

  const updateZoneStats = useCallback(
    (zoneId: string, updater: (s: ZoneStats) => ZoneStats) => {
      setStats((prev) => {
        const n = new Map(prev);
        const current = n.get(zoneId) || initializeStats();
        n.set(zoneId, updater(current));
        return n;
      });
    },
    [initializeStats]
  );

  const processDetections = useCallback(
    (detections: DetectionInput[]) => {
      const config = configRef.current;
      const currentTime = Date.now();
      const newTrackedObjects = new Map(objectsRef.current);
      const seenObjectIds = new Set<string>();

      detections.forEach((detection, index) => {
        const objectId = detection.id || `obj-${index}-${currentTime}`;
        seenObjectIds.add(objectId);
        const centerPoint: Point = {
          x: detection.boundingBox.x + detection.boundingBox.width / 2,
          y: detection.boundingBox.y + detection.boundingBox.height / 2,
        };
        const existingObject = newTrackedObjects.get(objectId);
        const prevPosition = previousPositionsRef.current.get(objectId);

        const trackedObj: TrackedObject = {
          id: objectId,
          type: detection.type,
          position: centerPoint,
          boundingBox: detection.boundingBox,
          enteredAt: existingObject?.enteredAt || new Date(),
          dwellTime: existingObject ? (currentTime - existingObject.enteredAt.getTime()) / 1000 : 0,
          path: existingObject?.path
            ? [...existingObject.path.slice(-20), centerPoint]
            : [centerPoint],
        };

        newTrackedObjects.set(objectId, trackedObj);
        previousPositionsRef.current.set(objectId, centerPoint);

        zones
          .filter((z) => z.enabled)
          .forEach((zone) => {
            const zoneObjects = zoneObjectsRef.current.get(zone.id) || new Set();
            const wasInZone = zoneObjects.has(objectId);
            const isInZone = isBoxInZone(detection.boundingBox, zone, config.minOverlapThreshold);

            // Tripwire
            if (
              zone.geometry.shape === 'line' &&
              prevPosition &&
              zone.geometry.points.length >= 2
            ) {
              const { crossed, direction } = didCrossLine(
                prevPosition,
                centerPoint,
                zone.geometry.points[0]!,
                zone.geometry.points[1]!
              );
              if (crossed) {
                const allowedDir = zone.config.tripwireDirection || 'both';
                const isCorrectDirection = allowedDir === 'both' || allowedDir === direction;
                if (isCorrectDirection) {
                  createEvent(zone, 'cross_line', trackedObj, undefined, zone.config.alertOnEnter);
                  onLineCross?.(zone, trackedObj, direction);
                  if (direction === 'left-to-right' || direction === 'top-to-bottom')
                    updateZoneStats(zone.id, (s) => ({ ...s, countIn: s.countIn + 1 }));
                  else updateZoneStats(zone.id, (s) => ({ ...s, countOut: s.countOut + 1 }));
                } else {
                  createEvent(zone, 'wrong_direction', trackedObj, undefined, true);
                }
              }
            }

            // Enter
            if (!wasInZone && isInZone) {
              zoneObjects.add(objectId);
              zoneObjectsRef.current.set(zone.id, zoneObjects);
              const newOccupancy = zoneObjects.size;
              createEvent(zone, 'enter', trackedObj, newOccupancy, zone.config.alertOnEnter);
              onEnter?.(zone, trackedObj);
              updateZoneStats(zone.id, (s) => ({
                ...s,
                currentOccupancy: newOccupancy,
                countIn: s.countIn + 1,
                maxOccupancyToday: Math.max(s.maxOccupancyToday, newOccupancy),
                lastDetectionAt: new Date(),
              }));
              onOccupancyChange?.(zone, newOccupancy, 1);
              if (zone.config.maxOccupancy && newOccupancy >= zone.config.maxOccupancy) {
                createEvent(zone, 'occupancy', trackedObj, newOccupancy, true);
                onMaxOccupancy?.(zone, newOccupancy);
              }
            }

            // Exit
            if (wasInZone && !isInZone) {
              zoneObjects.delete(objectId);
              zoneObjectsRef.current.set(zone.id, zoneObjects);
              const newOccupancy = zoneObjects.size;
              const dwellTime = trackedObj.dwellTime;
              createEvent(zone, 'exit', trackedObj, dwellTime, zone.config.alertOnExit);
              onExit?.(zone, trackedObj, dwellTime);
              updateZoneStats(zone.id, (s) => ({
                ...s,
                currentOccupancy: newOccupancy,
                countOut: s.countOut + 1,
                avgDwellTime: (s.avgDwellTime * s.countOut + dwellTime) / (s.countOut + 1),
              }));
              onOccupancyChange?.(zone, newOccupancy, -1);
            }

            // Dwell time
            if (
              isInZone &&
              zone.config.maxDwellTime &&
              trackedObj.dwellTime > zone.config.maxDwellTime
            ) {
              const alertKey = `${zone.id}-${objectId}-dwell`;
              const lastAlert = lastAlertTimeRef.current.get(alertKey) || 0;
              const cooldown = (zone.config.alertCooldown || 60) * 1000;
              if (currentTime - lastAlert > cooldown) {
                lastAlertTimeRef.current.set(alertKey, currentTime);
                createEvent(
                  zone,
                  'dwell_time',
                  trackedObj,
                  trackedObj.dwellTime,
                  zone.config.alertOnDwell
                );
                onDwellAlert?.(zone, trackedObj, trackedObj.dwellTime);
              }
            }
          });
      });

      // Remove lost objects
      const timeout = config.objectLostTimeout;
      newTrackedObjects.forEach((obj, id) => {
        if (!seenObjectIds.has(id)) {
          const timeSinceUpdate = currentTime - obj.enteredAt.getTime() - obj.dwellTime * 1000;
          if (timeSinceUpdate > timeout) {
            newTrackedObjects.delete(id);
            previousPositionsRef.current.delete(id);
            zoneObjectsRef.current.forEach((objects, zoneId) => {
              if (objects.has(id)) {
                objects.delete(id);
                updateZoneStats(zoneId, (s) => ({
                  ...s,
                  currentOccupancy: objects.size,
                  countOut: s.countOut + 1,
                }));
              }
            });
          }
        }
      });

      objectsRef.current = newTrackedObjects;
      setTrackedObjects(new Map(newTrackedObjects));

      zones.forEach((zone) => {
        const zoneObjects = zoneObjectsRef.current.get(zone.id) || new Set();
        const currentObjects: TrackedObject[] = [];
        zoneObjects.forEach((objId) => {
          const obj = newTrackedObjects.get(objId);
          if (obj) currentObjects.push(obj);
        });
        updateZoneStats(zone.id, (s) => ({ ...s, currentObjects }));
      });
    },
    [
      zones,
      createEvent,
      onEnter,
      onExit,
      onLineCross,
      onOccupancyChange,
      onMaxOccupancy,
      onDwellAlert,
      updateZoneStats,
    ]
  );

  const fetchZones = useCallback(async (): Promise<Zone[]> => zones, [zones]);

  const resetStats = useCallback(
    (zoneId?: string) => {
      if (zoneId) {
        setStats((prev) => new Map(prev).set(zoneId, initializeStats()));
      } else {
        const n = new Map<string, ZoneStats>();
        zones.forEach((z) => n.set(z.id, initializeStats()));
        setStats(n);
      }
    },
    [zones, initializeStats]
  );

  const updateConfig = useCallback((updates: Partial<ZoneDetectionConfig>) => {
    configRef.current = { ...configRef.current, ...updates };
  }, []);

  useEffect(() => {
    if (initialZones.length === 0) {
      /* sem zonas iniciais; nada a sincronizar */
    }
  }, [initialZones.length]);

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
