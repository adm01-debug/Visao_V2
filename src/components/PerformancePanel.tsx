import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  Cpu,
  HardDrive,
  Wifi,
  WifiOff,
  Gauge,
  ChevronUp,
  ChevronDown,
  X,
  Zap,
  Signal,
  MemoryStick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { usePerformanceMetrics } from "@/hooks/usePerformanceMetrics";
import { cn } from "@/lib/utils";

interface PerformancePanelProps {
  defaultExpanded?: boolean;
  position?: "bottom-left" | "bottom-right" | "top-left" | "top-right";
}

export function PerformancePanel({
  defaultExpanded = false,
  position = "bottom-right",
}: PerformancePanelProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const metrics = usePerformanceMetrics(isVisible);

  const getFPSColor = (fps: number) => {
    if (fps >= 55) return "text-emerald-400";
    if (fps >= 30) return "text-amber-400";
    return "text-red-400";
  };

  const getFPSBg = (fps: number) => {
    if (fps >= 55) return "bg-emerald-500/20";
    if (fps >= 30) return "bg-amber-500/20";
    return "bg-red-500/20";
  };

  const getLatencyColor = (latency: number) => {
    if (latency <= 50) return "text-emerald-400";
    if (latency <= 150) return "text-amber-400";
    return "text-red-400";
  };

  const getMemoryColor = (percentage: number) => {
    if (percentage <= 50) return "text-emerald-400";
    if (percentage <= 80) return "text-amber-400";
    return "text-red-400";
  };

  const getConnectionIcon = () => {
    if (metrics.connectionType === "4g") return <Signal className="h-3 w-3" />;
    if (metrics.connectionType === "3g") return <Wifi className="h-3 w-3" />;
    if (metrics.connectionType === "2g") return <WifiOff className="h-3 w-3" />;
    return <Wifi className="h-3 w-3" />;
  };

  const positionClasses = {
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
  };

  if (!isVisible) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsVisible(true)}
        className={cn("fixed z-50", positionClasses[position])}
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      className={cn(
        "fixed z-50 font-mono text-xs",
        positionClasses[position],
        "hidden md:block" // Ocultar em mobile
      )}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-hidden min-w-[280px]">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Activity className="h-4 w-4 text-primary" />
              <motion.div
                className="absolute inset-0 bg-primary/30 rounded-full"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <span className="font-semibold text-sm">Performance</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronUp className="h-3 w-3" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setIsVisible(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Quick Stats (Always Visible) */}
        <div className="flex items-center justify-between px-3 py-2 gap-3">
          {/* FPS */}
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md", getFPSBg(metrics.fps))}>
            <Gauge className={cn("h-3.5 w-3.5", getFPSColor(metrics.fps))} />
            <span className={cn("font-bold", getFPSColor(metrics.fps))}>
              {metrics.fps}
            </span>
            <span className="text-muted-foreground">FPS</span>
          </div>

          {/* Memory */}
          {metrics.memory && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
              <MemoryStick className={cn("h-3.5 w-3.5", getMemoryColor(metrics.memory.percentage))} />
              <span className={cn("font-bold", getMemoryColor(metrics.memory.percentage))}>
                {metrics.memory.used}
              </span>
              <span className="text-muted-foreground">MB</span>
            </div>
          )}

          {/* Latency */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
            <Zap className={cn("h-3.5 w-3.5", getLatencyColor(metrics.latency))} />
            <span className={cn("font-bold", getLatencyColor(metrics.latency))}>
              {metrics.latency}
            </span>
            <span className="text-muted-foreground">ms</span>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
                {/* FPS Detail */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">Frame Rate</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        metrics.fps >= 55
                          ? "border-emerald-500/50 text-emerald-400"
                          : metrics.fps >= 30
                          ? "border-amber-500/50 text-amber-400"
                          : "border-red-500/50 text-red-400"
                      )}
                    >
                      {metrics.fps >= 55 ? "Ótimo" : metrics.fps >= 30 ? "Bom" : "Baixo"}
                    </Badge>
                  </div>
                  <Progress
                    value={Math.min((metrics.fps / 60) * 100, 100)}
                    className="h-1.5"
                  />
                </div>

                {/* Memory Detail */}
                {metrics.memory && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Memória JS</span>
                      </div>
                      <span className="text-xs">
                        {metrics.memory.used} / {metrics.memory.total} MB
                      </span>
                    </div>
                    <Progress
                      value={metrics.memory.percentage}
                      className={cn(
                        "h-1.5",
                        metrics.memory.percentage > 80 && "[&>div]:bg-red-500",
                        metrics.memory.percentage > 50 && metrics.memory.percentage <= 80 && "[&>div]:bg-amber-500"
                      )}
                    />
                  </div>
                )}

                {/* Network Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    {getConnectionIcon()}
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px]">Conexão</span>
                      <span className="font-medium uppercase">{metrics.connectionType}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Wifi className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px]">Download</span>
                      <span className="font-medium">{metrics.downlink} Mbps</span>
                    </div>
                  </div>
                </div>

                {/* System Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                    <Cpu className="h-3 w-3 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span className="text-muted-foreground text-[10px]">CPU Cores</span>
                      <span className="font-medium">{metrics.cpuCores}</span>
                    </div>
                  </div>
                  {metrics.deviceMemory > 0 && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                      <MemoryStick className="h-3 w-3 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-[10px]">RAM Device</span>
                        <span className="font-medium">{metrics.deviceMemory} GB</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export default PerformancePanel;
