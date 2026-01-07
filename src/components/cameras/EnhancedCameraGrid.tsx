/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Enhanced Camera Grid - Grid de câmeras com funcionalidades avançadas
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Maximize2, 
  Volume2, 
  VolumeX,
  Settings,
  Wifi,
  WifiOff,
  MoreVertical,
  Eye,
  EyeOff,
  Camera as CameraIcon,
  RefreshCw,
  Download,
  Share2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Carousel } from '@/components/ui/MobileInteractions';

interface CameraData {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'warning' | 'alert';
  thumbnail?: string;
  streamUrl?: string;
  detectedPeople?: number;
  alertsCount?: number;
}

interface EnhancedCameraCardProps {
  camera: CameraData;
  onFullscreen?: () => void;
  onSettings?: () => void;
  onRefresh?: () => void;
  onSnapshot?: () => void;
  className?: string;
  isCompact?: boolean;
}

const statusConfig = {
  online: { color: 'bg-green-500', label: 'LIVE', icon: Wifi },
  offline: { color: 'bg-muted', label: 'OFF', icon: WifiOff },
  warning: { color: 'bg-yellow-500', label: 'AVISO', icon: AlertTriangle },
  alert: { color: 'bg-destructive animate-pulse', label: 'ALERTA', icon: AlertTriangle }
};

export function EnhancedCameraCard({
  camera,
  onFullscreen,
  onSettings,
  onRefresh,
  onSnapshot,
  className,
  isCompact = false
}: EnhancedCameraCardProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const status = statusConfig[camera.status];
  const StatusIcon = status.icon;

  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    await onRefresh?.();
    setTimeout(() => setIsLoading(false), 1000);
  }, [onRefresh]);

  return (
    <motion.div
      className={cn(
        "relative bg-card rounded-lg overflow-hidden border group",
        "transition-shadow hover:shadow-lg",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Thumbnail/Stream */}
      <div className={cn(
        "relative bg-muted",
        isCompact ? "aspect-video" : "aspect-[16/10]"
      )}>
        {camera.thumbnail ? (
          <img
            src={camera.thumbnail}
            alt={camera.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CameraIcon className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}

        {/* Loading Overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 flex items-center justify-center"
            >
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge 
            variant="secondary" 
            className={cn(
              "text-xs font-bold px-2 py-0.5",
              status.color,
              "text-white"
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
            {status.label}
          </Badge>
          {camera.alertsCount && camera.alertsCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {camera.alertsCount} alertas
            </Badge>
          )}
        </div>

        {/* People Count */}
        {camera.detectedPeople !== undefined && camera.detectedPeople > 0 && (
          <div className="absolute top-2 right-2">
            <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
              <Eye className="w-3 h-3 mr-1" />
              {camera.detectedPeople}
            </Badge>
          </div>
        )}

        {/* Hover Controls */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
            >
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={() => setIsMuted(!isMuted)}
                  >
                    {isMuted ? (
                      <VolumeX className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={handleRefresh}
                  >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white"
                    onClick={onFullscreen}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 bg-black/40 hover:bg-black/60 text-white"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={onSnapshot}>
                        <Download className="w-4 h-4 mr-2" />
                        Capturar Snapshot
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Share2 className="w-4 h-4 mr-2" />
                        Compartilhar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={onSettings}>
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info */}
      {!isCompact && (
        <div className="p-3">
          <h4 className="font-medium text-sm truncate">{camera.name}</h4>
          <p className="text-xs text-muted-foreground truncate">{camera.location}</p>
        </div>
      )}
    </motion.div>
  );
}

// Grid Layout Options
type GridLayout = '1x1' | '2x2' | '3x3' | '4x4' | '1+3' | '2+4';

interface CameraGridProps {
  cameras: CameraData[];
  layout?: GridLayout;
  onCameraClick?: (camera: CameraData) => void;
  onLayoutChange?: (layout: GridLayout) => void;
  className?: string;
}

const layoutConfigs: Record<GridLayout, string> = {
  '1x1': 'grid-cols-1',
  '2x2': 'grid-cols-2',
  '3x3': 'grid-cols-3',
  '4x4': 'grid-cols-4',
  '1+3': 'grid-cols-3',
  '2+4': 'grid-cols-4'
};

export function CameraGrid({
  cameras,
  layout = '2x2',
  onCameraClick,
  className
}: CameraGridProps) {
  const gridClass = layoutConfigs[layout];

  // Mobile carousel view
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  if (isMobile && cameras.length > 1) {
    return (
      <Carousel
        items={cameras.map(camera => (
          <EnhancedCameraCard
            key={camera.id}
            camera={camera}
            onFullscreen={() => onCameraClick?.(camera)}
            className="mx-2"
          />
        ))}
        className={className}
        showArrows={false}
      />
    );
  }

  return (
    <div className={cn("grid gap-4", gridClass, className)}>
      {cameras.map((camera, index) => {
        // Special layout handling
        const isMain = (layout === '1+3' && index === 0) || 
                       (layout === '2+4' && index < 2);
        
        return (
          <motion.div
            key={camera.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              isMain && layout === '1+3' && index === 0 && "col-span-2 row-span-2",
              isMain && layout === '2+4' && "col-span-2"
            )}
          >
            <EnhancedCameraCard
              camera={camera}
              onFullscreen={() => onCameraClick?.(camera)}
              isCompact={!isMain && (layout === '3x3' || layout === '4x4')}
            />
          </motion.div>
        );
      })}
    </div>
  );
}
