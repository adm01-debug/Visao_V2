import React from "react";
import {
  Camera, Bell, Users, MapPin, Settings, LayoutDashboard,
  Video, BarChart3, Shield, AlertTriangle,
  Wifi, WifiOff,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
  if (status === "online") return <Wifi className="h-4 w-4 text-success" />;
  if (status === "offline") return <WifiOff className="h-4 w-4 text-muted-foreground" />;
  if (status === "alert") return <AlertTriangle className="h-4 w-4 text-destructive" />;
  return <Camera className="h-4 w-4" />;
}

export function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical": return "bg-destructive/15 text-destructive border-destructive/30";
    case "high": return "bg-warning/15 text-warning border-warning/30";
    case "medium": return "bg-warning/10 text-warning border-warning/25";
    default: return "bg-primary/15 text-primary border-primary/30";
  }
}

export function getListTypeBadge(listType: string | null) {
  if (listType === "whitelist") return <Badge variant="outline" className="text-xs bg-success/15 text-success border-success/30">Whitelist</Badge>;
  if (listType === "blacklist") return <Badge variant="outline" className="text-xs bg-destructive/15 text-destructive border-destructive/30">Blacklist</Badge>;
  return null;
}
