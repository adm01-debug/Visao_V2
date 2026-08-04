/**
 * VISÃO - Zone CRUD Operations
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zone, ZoneStats } from '@/types/zones';
import { toast } from 'sonner';

export function useZoneCRUD(
  cameraId: string,
  initializeStats: (zone: Zone) => ZoneStats,
  setZones: React.Dispatch<React.SetStateAction<Zone[]>>,
  setStats: React.Dispatch<React.SetStateAction<Map<string, ZoneStats>>>,
  zoneObjectsRef: React.MutableRefObject<Map<string, Set<string>>>
) {
  const addZone = useCallback(
    async (zoneData: Omit<Zone, 'id' | 'createdAt' | 'updatedAt' | 'stats'>): Promise<Zone> => {
      const newZone: Zone = {
        ...zoneData,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('zones').insert([
            {
              id: newZone.id,
              camera_id: cameraId,
              user_id: user.id,
              name: newZone.name,
              type: newZone.type,
              points: JSON.parse(JSON.stringify(newZone.geometry.points)),
              color: newZone.color,
              is_active: newZone.enabled,
            },
          ]);
        }
      } catch {
        /* persistência best-effort; mantém zona em estado local mesmo sem Supabase */
      }

      setZones((prev) => [...prev, newZone]);
      setStats((prev) => new Map(prev).set(newZone.id, initializeStats(newZone)));
      zoneObjectsRef.current.set(newZone.id, new Set());
      toast.success(`Zona "${newZone.name}" criada`);
      return newZone;
    },
    [cameraId, initializeStats, setZones, setStats, zoneObjectsRef]
  );

  const updateZone = useCallback(
    async (zoneId: string, updates: Partial<Zone>) => {
      try {
        const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (updates.name) updateData.name = updates.name;
        if (updates.type) updateData.type = updates.type;
        if (updates.geometry?.points) updateData.points = updates.geometry.points;
        if (updates.color) updateData.color = updates.color;
        if (updates.enabled !== undefined) updateData.is_active = updates.enabled;
        await supabase
          .from('zones')
          .update(updateData as never)
          .eq('id', zoneId);
      } catch {
        /* persistência best-effort; aplica atualização no estado local mesmo sem Supabase */
      }
      setZones((prev) =>
        prev.map((z) => (z.id === zoneId ? { ...z, ...updates, updatedAt: new Date() } : z))
      );
      toast.success('Zona atualizada');
    },
    [setZones]
  );

  const removeZone = useCallback(
    async (zoneId: string) => {
      try {
        await supabase.from('zones').delete().eq('id', zoneId);
      } catch {
        /* persistência best-effort; remove do estado local mesmo sem Supabase */
      }
      setZones((prev) => prev.filter((z) => z.id !== zoneId));
      setStats((prev) => {
        const n = new Map(prev);
        n.delete(zoneId);
        return n;
      });
      zoneObjectsRef.current.delete(zoneId);
      toast.success('Zona removida');
    },
    [setZones, setStats, zoneObjectsRef]
  );

  const toggleZone = useCallback(
    (zoneId: string) => {
      setZones((prev) => prev.map((z) => (z.id === zoneId ? { ...z, enabled: !z.enabled } : z)));
    },
    [setZones]
  );

  return { addZone, updateZone, removeZone, toggleZone };
}
