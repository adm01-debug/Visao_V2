/**
 * VISÃO - Zone Event Creation
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zone, ZoneEvent, ZoneEventType, TrackedObject, ZoneEvents } from '@/types/zones';

interface UseZoneEventCreatorOptions {
  cameraId: string;
  cameraName: string;
  createAlerts: boolean;
  saveEvents: boolean;
  onAlert?: ZoneEvents['onAlert'];
  setRecentEvents: React.Dispatch<React.SetStateAction<ZoneEvent[]>>;
}

export function useZoneEventCreator(options: UseZoneEventCreatorOptions) {
  const { cameraId, cameraName, createAlerts, saveEvents, onAlert, setRecentEvents } = options;

  const getEventMessage = (type: ZoneEventType, value?: number): string => {
    const messages: Record<ZoneEventType, string> = {
      enter: 'Objeto entrou na zona', exit: 'Objeto saiu da zona',
      cross_line: 'Linha cruzada', dwell_time: `Permanência excedida: ${value}s`,
      occupancy: `Ocupação: ${value} pessoas`, count_in: `Entrada registrada (total: ${value})`,
      count_out: `Saída registrada (total: ${value})`, crowd_density: `Densidade alta: ${value}%`,
      loitering: 'Vadiagem detectada', wrong_direction: 'Direção incorreta',
      ppe_violation: 'Violação de EPI detectada',
    };
    return messages[type] || 'Evento detectado';
  };

  const createEvent = useCallback(async (
    zone: Zone, eventType: ZoneEventType, object?: TrackedObject,
    value?: number, generateAlert: boolean = false
  ): Promise<ZoneEvent> => {
    const event: ZoneEvent = {
      id: crypto.randomUUID(), zoneId: zone.id, zoneName: zone.name,
      cameraId, eventType, object, value, alertGenerated: generateAlert, timestamp: new Date(),
    };

    setRecentEvents(prev => [event, ...prev.slice(0, 99)]);

    if (saveEvents) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('zone_events').insert([{
            zone_id: zone.id, user_id: user.id, event_type: eventType,
            detected_objects: object ? JSON.parse(JSON.stringify([{ id: object.id, type: object.type, position: object.position }])) : [],
            timestamp: new Date().toISOString(),
          }]);
        }
      } catch {}
    }

    if (generateAlert && createAlerts) {
      const severity = zone.type === 'restricted' ? 'high' : 'medium';
      try {
        await supabase.from('alerts').insert({
          camera_name: cameraName, type: 'security' as const, severity,
          message: `${zone.name}: ${getEventMessage(eventType, value)}`, is_read: false,
        });
      } catch {}
      onAlert?.(zone, event);
    }

    return event;
  }, [cameraId, cameraName, createAlerts, saveEvents, onAlert, setRecentEvents]);

  return { createEvent };
}
