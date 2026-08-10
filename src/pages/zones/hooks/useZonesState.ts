import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { logger } from '@/lib/logger';
import { useManagedFilters } from '@/hooks/useManagedFilters';
import { ZoneStats, ZoneEvent, zoneTypeConfig } from '@/components/zones';

type DbZoneLocal = Tables<'zones'>;

interface ZonesFilters extends Record<string, unknown> {
  searchQuery: string;
  selectedCameraFilter: string;
  selectedTypeFilter: string;
}

const defaultZonesFilters: ZonesFilters = {
  searchQuery: '',
  selectedCameraFilter: 'all',
  selectedTypeFilter: 'all',
};

export function useZonesState() {
  const [zones, setZones] = useState<DbZoneLocal[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneStats, setZoneStats] = useState<Record<string, ZoneStats>>({});
  const [zoneEvents, setZoneEvents] = useState<Record<string, ZoneEvent[]>>({});

  const { filters, setFilters, clearFilters, hasActiveFilters } = useManagedFilters<ZonesFilters>({
    scope: 'zones',
    defaults: defaultZonesFilters,
    labels: { searchQuery: 'busca', selectedCameraFilter: 'câmera', selectedTypeFilter: 'tipo' },
    isActive: (key, value) => (key === 'searchQuery' ? value !== '' : value !== 'all'),
  });

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setZones(data || []);

      const statsMap: Record<string, ZoneStats> = {};
      for (const zone of data || []) {
        try {
          const yesterday = new Date(Date.now() - 86400000).toISOString();
          const { data: eventsData } = await supabase
            .from('zone_events')
            .select('event_type, timestamp')
            .eq('zone_id', zone.id)
            .gte('timestamp', yesterday)
            .order('timestamp', { ascending: false });

          if (eventsData) {
            statsMap[zone.id] = {
              currentOccupancy: Math.max(
                0,
                eventsData.filter((e) => e.event_type.includes('enter')).length -
                  eventsData.filter((e) => e.event_type.includes('exit')).length
              ),
              countIn: eventsData.filter((e) => e.event_type.includes('enter')).length,
              countOut: eventsData.filter((e) => e.event_type.includes('exit')).length,
              avgDwellTime: 0,
              alertsToday: eventsData.filter((e) => e.event_type.includes('alert')).length,
              lastEvent: eventsData[0]?.timestamp,
            };
          }
        } catch (e) {
          logger.error(`Erro ao carregar estatísticas da zona ${zone.id}`, e, 'useZonesState');
        }
      }
      setZoneStats(statsMap);
    } catch {
      toast.error('Erro ao carregar zonas');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadZoneEvents = async (zoneId: string) => {
    try {
      const { data } = await supabase
        .from('zone_events')
        .select('*')
        .eq('zone_id', zoneId)
        .order('created_at', { ascending: false })
        .limit(50);
      setZoneEvents((prev) => ({ ...prev, [zoneId]: data || [] }));
    } catch {
      /* carregamento de eventos best-effort; mantém lista atual da zona */
    }
  };

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const filteredZones = useMemo(
    () =>
      zones.filter((zone) => {
        if (
          filters.searchQuery &&
          !zone.name.toLowerCase().includes(filters.searchQuery.toLowerCase())
        )
          return false;
        if (
          filters.selectedCameraFilter !== 'all' &&
          zone.camera_id !== filters.selectedCameraFilter
        )
          return false;
        if (filters.selectedTypeFilter !== 'all' && zone.type !== filters.selectedTypeFilter)
          return false;
        return true;
      }),
    [zones, filters]
  );

  const stats = useMemo(
    () => ({
      total: zones.length,
      active: zones.filter((z) => z.is_active).length,
      restricted: zones.filter((z) => z.type === 'restricted').length,
      counting: zones.filter((z) => z.type === 'counting' || z.type === 'tripwire').length,
    }),
    [zones]
  );

  const toggleZone = async (zone: DbZoneLocal) => {
    try {
      const { error } = await supabase
        .from('zones')
        .update({ is_active: !zone.is_active })
        .eq('id', zone.id);
      if (error) throw error;
      toast.success(zone.is_active ? 'Zona desativada' : 'Zona ativada');
      loadZones();
    } catch {
      toast.error('Erro ao alternar zona');
    }
  };

  const deleteZone = async (zoneId: string) => {
    try {
      const { error } = await supabase.from('zones').delete().eq('id', zoneId);
      if (error) throw error;
      toast.success('Zona excluída');
      loadZones();
      return true;
    } catch {
      toast.error('Erro ao excluir zona');
      return false;
    }
  };

  const saveZone = async (
    data: TablesInsert<'zones'> | TablesUpdate<'zones'>,
    editingId?: string
  ) => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('zones')
          .update(data as TablesUpdate<'zones'>)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('zones').insert(data as TablesInsert<'zones'>);
        if (error) throw error;
      }
      loadZones();
      return true;
    } catch {
      toast.error('Erro ao salvar zona');
      return false;
    }
  };

  return {
    zones,
    loading,
    filters,
    setFilters,
    clearFilters,
    hasActiveFilters,
    filteredZones,
    stats,
    zoneStats,
    zoneEvents,
    loadZones,
    loadZoneEvents,
    toggleZone,
    deleteZone,
    saveZone,
    zoneTypeConfigs: zoneTypeConfig,
  };
}
