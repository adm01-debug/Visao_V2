import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useMaintenanceAlertBadge } from "@/hooks/useMaintenanceAlertBadge";
import { useCollabUnreadBadge } from "@/hooks/useCollabUnreadBadge";

export interface SidebarStatus {
  unreadAlerts: number;
  onlineCameras: number;
  totalCameras: number;
  activeRules: number;
  totalRules: number;
  registeredPersons: number;
  activeZones: number;
  /** Onda 137 — incidentes de manutenção abertos (0 para quem não é admin). */
  openMaintenanceAlerts: number;
  openMaintenanceCritical: number;
  maintenanceAtCeiling: number;
  /** Onda 139 — avisos visíveis da rede colaborativa (silenciados excluídos). */
  collabUnread: number;
  collabActionable: number;
  collabCritical: number;
  collabOldestAgeHours: number | null;
  isLoading: boolean;
}


export function useSidebarStatus(): SidebarStatus {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  useEffect(() => {
    // Clean up any existing channels first (handles Strict Mode double-mount)
    channelsRef.current.forEach(ch => supabase.removeChannel(ch));
    channelsRef.current = [];

    const tables = [
      { name: 'alerts', queryKey: 'sidebar-alerts-count' },
      { name: 'cameras', queryKey: 'sidebar-cameras-status' },
      { name: 'rules', queryKey: 'sidebar-rules-count' },
      { name: 'registered_persons', queryKey: 'sidebar-persons-count' },
      { name: 'zones', queryKey: 'sidebar-zones-count' },
    ];

    const channels = tables.map(({ name, queryKey }) =>
      supabase
        .channel(`sidebar-${name}-${Date.now()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: name }, () => {
          queryClient.invalidateQueries({ queryKey: [queryKey] });
        })
        .subscribe()
    );

    channelsRef.current = channels;

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
      channelsRef.current = [];
    };
  }, [queryClient]);

  // ============================================
  // QUERIES
  // ============================================

  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ["sidebar-alerts-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("alerts")
        .select("*", { count: "exact", head: true })
        .eq("is_read", false);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: camerasData, isLoading: camerasLoading } = useQuery({
    queryKey: ["sidebar-cameras-status"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cameras").select("status");
      if (error) throw error;
      return { online: data?.filter(c => c.status === "online").length || 0, total: data?.length || 0 };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["sidebar-rules-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rules").select("is_active");
      if (error) throw error;
      return { active: data?.filter(r => r.is_active).length || 0, total: data?.length || 0 };
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const { data: personsCount, isLoading: personsLoading } = useQuery({
    queryKey: ["sidebar-persons-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("registered_persons")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  const { data: zonesCount, isLoading: zonesLoading } = useQuery({
    queryKey: ["sidebar-zones-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("zones")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 120000,
    staleTime: 60000,
  });

  // Onda 137 — contagem de incidentes de manutenção (só carrega para admin).
  const { counts: maintenance } = useMaintenanceAlertBadge();
  // Onda 139 — avisos da rede colaborativa já agregados pelo banco.
  const { summary: collab } = useCollabUnreadBadge();

  return {
    unreadAlerts: alertsData || 0,
    onlineCameras: camerasData?.online || 0,
    totalCameras: camerasData?.total || 0,
    activeRules: rulesData?.active || 0,
    totalRules: rulesData?.total || 0,
    registeredPersons: personsCount || 0,
    activeZones: zonesCount || 0,
    openMaintenanceAlerts: maintenance.open,
    openMaintenanceCritical: maintenance.openCritical,
    maintenanceAtCeiling: maintenance.atCeiling,
    collabUnread: collab.unread,
    collabActionable: collab.actionable,
    collabCritical: collab.critical,
    collabOldestAgeHours: collab.oldestAgeHours,
    isLoading: alertsLoading || camerasLoading || rulesLoading || personsLoading || zonesLoading,
  };

  };
}
