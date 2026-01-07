import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SidebarStatus {
  unreadAlerts: number;
  onlineCameras: number;
  totalCameras: number;
  activeRules: number;
  totalRules: number;
  registeredPersons: number;
  activeZones: number;
  isLoading: boolean;
}

export function useSidebarStatus(): SidebarStatus {
  const queryClient = useQueryClient();

  // ============================================
  // REALTIME SUBSCRIPTIONS
  // ============================================
  
  useEffect(() => {
    // Subscribe to alerts changes (new alerts, read status updates)
    const alertsChannel = supabase
      .channel('sidebar-alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'alerts'
        },
        () => {
          // Invalidate alerts query to refetch
          queryClient.invalidateQueries({ queryKey: ["sidebar-alerts-count"] });
        }
      )
      .subscribe();

    // Subscribe to cameras changes (status updates)
    const camerasChannel = supabase
      .channel('sidebar-cameras-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cameras'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sidebar-cameras-status"] });
        }
      )
      .subscribe();

    // Subscribe to rules changes
    const rulesChannel = supabase
      .channel('sidebar-rules-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rules'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sidebar-rules-count"] });
        }
      )
      .subscribe();

    // Subscribe to registered_persons changes
    const personsChannel = supabase
      .channel('sidebar-persons-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'registered_persons'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sidebar-persons-count"] });
        }
      )
      .subscribe();

    // Subscribe to zones changes
    const zonesChannel = supabase
      .channel('sidebar-zones-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'zones'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["sidebar-zones-count"] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(camerasChannel);
      supabase.removeChannel(rulesChannel);
      supabase.removeChannel(personsChannel);
      supabase.removeChannel(zonesChannel);
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
    refetchInterval: 60000, // Longer interval since we have realtime
    staleTime: 30000,
  });

  const { data: camerasData, isLoading: camerasLoading } = useQuery({
    queryKey: ["sidebar-cameras-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cameras")
        .select("status");
      
      if (error) throw error;
      
      const online = data?.filter(c => c.status === "online").length || 0;
      const total = data?.length || 0;
      
      return { online, total };
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: rulesData, isLoading: rulesLoading } = useQuery({
    queryKey: ["sidebar-rules-count"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rules")
        .select("is_active");
      
      if (error) throw error;
      
      const active = data?.filter(r => r.is_active).length || 0;
      const total = data?.length || 0;
      
      return { active, total };
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

  return {
    unreadAlerts: alertsData || 0,
    onlineCameras: camerasData?.online || 0,
    totalCameras: camerasData?.total || 0,
    activeRules: rulesData?.active || 0,
    totalRules: rulesData?.total || 0,
    registeredPersons: personsCount || 0,
    activeZones: zonesCount || 0,
    isLoading: alertsLoading || camerasLoading || rulesLoading || personsLoading || zonesLoading,
  };
}
