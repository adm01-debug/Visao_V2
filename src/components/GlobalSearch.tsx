import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Bell,
  Users,
  MapPin,
  Settings,
  LayoutDashboard,
  Video,
  BarChart3,
  Shield,
  Car,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "camera" | "alert" | "person" | "zone" | "plate";
  title: string;
  subtitle?: string;
  status?: string;
  icon: React.ReactNode;
  route: string;
}

const quickActions = [
  { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" />, route: "/dashboard" },
  { id: "cameras", title: "Câmeras", icon: <Camera className="h-4 w-4" />, route: "/cameras" },
  { id: "alerts", title: "Alertas", icon: <Bell className="h-4 w-4" />, route: "/alerts" },
  { id: "people", title: "Pessoas", icon: <Users className="h-4 w-4" />, route: "/people" },
  { id: "zones", title: "Zonas", icon: <MapPin className="h-4 w-4" />, route: "/zones" },
  { id: "recordings", title: "Gravações", icon: <Video className="h-4 w-4" />, route: "/recordings" },
  { id: "analytics", title: "Analytics", icon: <BarChart3 className="h-4 w-4" />, route: "/analytics" },
  { id: "security", title: "Segurança", icon: <Shield className="h-4 w-4" />, route: "/security" },
  { id: "settings", title: "Configurações", icon: <Settings className="h-4 w-4" />, route: "/settings" },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Fetch cameras
  const { data: cameras = [] } = useQuery({
    queryKey: ["search-cameras"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cameras")
        .select("id, name, location, status")
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ["search-alerts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, message, camera_name, severity, type, is_read")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch persons
  const { data: persons = [] } = useQuery({
    queryKey: ["search-persons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("registered_persons")
        .select("id, name, role, department, list_type, is_active")
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Fetch zones
  const { data: zones = [] } = useQuery({
    queryKey: ["search-zones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zones")
        .select("id, name, type, is_active")
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    // Listen for custom event
    const handleOpenSearch = () => setOpen(true);
    document.addEventListener("open-search", handleOpenSearch);
    document.addEventListener("keydown", down);
    
    return () => {
      document.removeEventListener("keydown", down);
      document.removeEventListener("open-search", handleOpenSearch);
    };
  }, []);

  const handleSelect = useCallback(
    (route: string) => {
      setOpen(false);
      setSearch("");
      navigate(route);
    },
    [navigate]
  );

  const getCameraIcon = (status: string) => {
    if (status === "online") return <Wifi className="h-4 w-4 text-emerald-400" />;
    if (status === "offline") return <WifiOff className="h-4 w-4 text-muted-foreground" />;
    if (status === "alert") return <AlertTriangle className="h-4 w-4 text-red-400" />;
    return <Camera className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getListTypeBadge = (listType: string | null) => {
    if (listType === "whitelist") return <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Whitelist</Badge>;
    if (listType === "blacklist") return <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Blacklist</Badge>;
    return null;
  };

  // Filter results based on search
  const filteredCameras = cameras.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.location.toLowerCase().includes(search.toLowerCase())
  );

  const filteredAlerts = alerts.filter((a) =>
    a.message.toLowerCase().includes(search.toLowerCase()) ||
    a.camera_name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredPersons = persons.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.role?.toLowerCase() || "").includes(search.toLowerCase()) ||
    (p.department?.toLowerCase() || "").includes(search.toLowerCase())
  );

  const filteredZones = zones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredActions = quickActions.filter((a) =>
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  const hasResults =
    filteredCameras.length > 0 ||
    filteredAlerts.length > 0 ||
    filteredPersons.length > 0 ||
    filteredZones.length > 0 ||
    filteredActions.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar câmeras, alertas, pessoas, zonas..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>
          <div className="flex flex-col items-center gap-2 py-6">
            <Search className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Nenhum resultado encontrado</p>
            <p className="text-xs text-muted-foreground/70">
              Tente buscar por nome, localização ou descrição
            </p>
          </div>
        </CommandEmpty>

        {/* Quick Actions */}
        {filteredActions.length > 0 && (
          <CommandGroup heading="Navegação Rápida">
            {filteredActions.slice(0, 5).map((action) => (
              <CommandItem
                key={action.id}
                value={action.title}
                onSelect={() => handleSelect(action.route)}
                className="flex items-center gap-3 px-3 py-2"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  {action.icon}
                </div>
                <span>{action.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Cameras */}
        {filteredCameras.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Câmeras (${filteredCameras.length})`}>
              {filteredCameras.slice(0, 5).map((camera) => (
                <CommandItem
                  key={camera.id}
                  value={`camera-${camera.name}`}
                  onSelect={() => handleSelect(`/cameras/${camera.id}`)}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                      {getCameraIcon(camera.status)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{camera.name}</span>
                      <span className="text-xs text-muted-foreground">{camera.location}</span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs capitalize",
                      camera.status === "online" && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                      camera.status === "offline" && "bg-muted text-muted-foreground",
                      camera.status === "alert" && "bg-red-500/20 text-red-400 border-red-500/30"
                    )}
                  >
                    {camera.status}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Alerts */}
        {filteredAlerts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Alertas (${filteredAlerts.length})`}>
              {filteredAlerts.slice(0, 5).map((alert) => (
                <CommandItem
                  key={alert.id}
                  value={`alert-${alert.message}`}
                  onSelect={() => handleSelect(`/alerts?id=${alert.id}`)}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      alert.is_read ? "bg-muted" : "bg-primary/10"
                    )}>
                      <Bell className={cn(
                        "h-4 w-4",
                        alert.is_read ? "text-muted-foreground" : "text-primary"
                      )} />
                    </div>
                    <div className="flex flex-col">
                      <span className={cn("font-medium", !alert.is_read && "text-foreground")}>
                        {alert.message.slice(0, 50)}...
                      </span>
                      <span className="text-xs text-muted-foreground">{alert.camera_name}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn("text-xs capitalize", getSeverityColor(alert.severity))}>
                    {alert.severity}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Persons */}
        {filteredPersons.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Pessoas (${filteredPersons.length})`}>
              {filteredPersons.slice(0, 5).map((person) => (
                <CommandItem
                  key={person.id}
                  value={`person-${person.name}`}
                  onSelect={() => handleSelect(`/people/${person.id}`)}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      person.is_active ? "bg-primary/10" : "bg-muted"
                    )}>
                      <Users className={cn(
                        "h-4 w-4",
                        person.is_active ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{person.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {[person.role, person.department].filter(Boolean).join(" • ") || "Sem cargo"}
                      </span>
                    </div>
                  </div>
                  {getListTypeBadge(person.list_type)}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Zones */}
        {filteredZones.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Zonas (${filteredZones.length})`}>
              {filteredZones.slice(0, 5).map((zone) => (
                <CommandItem
                  key={zone.id}
                  value={`zone-${zone.name}`}
                  onSelect={() => handleSelect(`/zones/${zone.id}`)}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md",
                      zone.is_active ? "bg-amber-500/10" : "bg-muted"
                    )}>
                      <MapPin className={cn(
                        "h-4 w-4",
                        zone.is_active ? "text-amber-400" : "text-muted-foreground"
                      )} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{zone.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{zone.type}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className={cn(
                    "text-xs",
                    zone.is_active 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {zone.is_active ? "Ativa" : "Inativa"}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↑↓</kbd>
          <span>Navegar</span>
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">↵</kbd>
          <span>Selecionar</span>
        </div>
        <div className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd>
          <span>Fechar</span>
        </div>
      </div>
    </CommandDialog>
  );
}

export default GlobalSearch;
