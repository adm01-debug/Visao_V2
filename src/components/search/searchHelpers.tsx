import React from "react";
import {
  Camera, Bell, Users, MapPin, Settings, LayoutDashboard,
  Video, BarChart3, Shield, Search, AlertTriangle,
  Wifi, WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const quickActions = [
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

export function getCameraIcon(status: string) {
  if (status === "online") return <Wifi className="h-4 w-4 text-emerald-400" />;
  if (status === "offline") return <WifiOff className="h-4 w-4 text-muted-foreground" />;
  if (status === "alert") return <AlertTriangle className="h-4 w-4 text-red-400" />;
  return <Camera className="h-4 w-4" />;
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "medium": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
  }
}

export function getListTypeBadge(listType: string | null) {
  if (listType === "whitelist") return <Badge variant="outline" className="text-xs bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Whitelist</Badge>;
  if (listType === "blacklist") return <Badge variant="outline" className="text-xs bg-red-500/20 text-red-400 border-red-500/30">Blacklist</Badge>;
  return null;
}
