import { useQuery } from "@tanstack/react-query";
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
    refetchInterval: 15000, // Refresh every 15 seconds
    staleTime: 10000,
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
    refetchInterval: 30000,
    staleTime: 20000,
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
    refetchInterval: 60000,
    staleTime: 30000,
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
    refetchInterval: 60000,
    staleTime: 30000,
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
    refetchInterval: 60000,
    staleTime: 30000,
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
