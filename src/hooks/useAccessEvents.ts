import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import type { AccessEvent, AccessStatus } from '@/components/security/SecurityTypes';

export function useAccessEvents() {
  const [events, setEvents] = useState<AccessEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recognition_logs')
        .select('*, registered_persons(name, photo_url), cameras(name, location)')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;

      const mappedEvents: AccessEvent[] = (data || []).map((log) => {
        const person = Array.isArray(log.registered_persons)
          ? log.registered_persons[0]
          : log.registered_persons;
        const camera = Array.isArray(log.cameras) ? log.cameras[0] : log.cameras;

        return {
          id: log.id,
          timestamp: log.timestamp,
          personId: log.person_id || 'unknown',
          personName: person?.name || 'Desconhecido',
          personPhoto: person?.photo_url || undefined,
          status: (log.recognized ? 'granted' : 'denied') as AccessStatus,
          cameraName: camera?.name || 'Câmera',
          location: camera?.location || 'Local',
          confidence: Number(log.confidence) || 0,
        };
      });

      setEvents(mappedEvents);
    } catch (err) {
      logger.error('Erro ao buscar eventos de acesso:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refetch: fetchEvents };
}
