import { useState } from 'react';
import { Camera, AlertTriangle, Eye, EyeOff, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Camera as CameraType } from '@/types/surveillance';
import { mockCameras } from '@/data/mockData';
import { CameraModal } from './CameraModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Camera positions on the floor plan (percentage-based)
const cameraPositions: Record<string, { x: number; y: number; rotation: number }> = {
  'cam-001': { x: 15, y: 12, rotation: 135 },   // Entrada Principal
  'cam-002': { x: 65, y: 35, rotation: 0 },     // Linha de Produção 1
  'cam-003': { x: 8, y: 75, rotation: 45 },     // Estacionamento
  'cam-004': { x: 85, y: 65, rotation: 270 },   // Almoxarifado
  'cam-005': { x: 35, y: 80, rotation: 0 },     // Refeitório
  'cam-006': { x: 45, y: 25, rotation: 180 },   // Escritório
  'cam-007': { x: 30, y: 50, rotation: 90 },    // Corredor Principal
  'cam-008': { x: 92, y: 85, rotation: 315 },   // Área de Carga
};

const statusColors: Record<string, string> = {
  online: 'bg-success',
  offline: 'bg-muted-foreground',
  alert: 'bg-destructive',
  warning: 'bg-warning',
};

const statusGlow: Record<string, string> = {
  online: 'shadow-[0_0_12px_rgba(34,197,94,0.6)]',
  offline: '',
  alert: 'shadow-[0_0_12px_rgba(239,68,68,0.8)] animate-pulse',
  warning: 'shadow-[0_0_12px_rgba(234,179,8,0.6)]',
};

export function FloorPlanMap() {
  const [selectedCamera, setSelectedCamera] = useState<CameraType | null>(null);
  const [hoveredCamera, setHoveredCamera] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showOffline, setShowOffline] = useState(true);

  const filteredCameras = showOffline 
    ? mockCameras 
    : mockCameras.filter(c => c.status !== 'offline');

  const alertCameras = mockCameras.filter(c => c.status === 'alert' || c.status === 'warning');

  return (
    <div className="p-6 space-y-6 overflow-auto h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Mapa de Câmeras</h1>
          <p className="text-muted-foreground mt-1">
            Visualização da planta com localização das câmeras
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowOffline(!showOffline)}
            className="gap-2"
          >
            {showOffline ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showOffline ? 'Ocultar Offline' : 'Mostrar Offline'}
          </Button>
        </div>
      </div>

      {/* Legend & Stats */}
      <div className="flex items-center justify-between flex-wrap gap-4 animate-fade-in">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-success" />
            <span className="text-sm text-muted-foreground">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-warning" />
            <span className="text-sm text-muted-foreground">Atenção</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-muted-foreground">Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span className="text-sm text-muted-foreground">Offline</span>
          </div>
        </div>

        {alertCameras.length > 0 && (
          <Badge variant="alert" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {alertCameras.length} câmera{alertCameras.length > 1 ? 's' : ''} com alerta
          </Badge>
        )}
      </div>

      {/* Map Container */}
      <div className="glass-card p-4 animate-fade-in-delay-1">
        {/* Zoom Controls */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
              disabled={zoom <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-16 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(Math.min(2, zoom + 0.25))}
              disabled={zoom >= 2}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setZoom(1)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Clique em uma câmera para visualizar
          </p>
        </div>

        {/* Floor Plan */}
        <div 
          className="relative bg-secondary/30 rounded-xl overflow-hidden border border-border"
          style={{ 
            height: '500px',
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            width: zoom !== 1 ? `${100 / zoom}%` : '100%',
          }}
        >
          {/* Grid Pattern */}
          <div 
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />

          {/* Building Sections */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Entrada / Portaria */}
            <rect x="5" y="5" width="20" height="15" fill="hsl(var(--primary) / 0.1)" stroke="hsl(var(--primary) / 0.3)" strokeWidth="0.3" rx="0.5" />
            <text x="15" y="13" fill="hsl(var(--foreground))" fontSize="2" textAnchor="middle" className="font-medium">Entrada</text>

            {/* Escritório */}
            <rect x="30" y="15" width="25" height="20" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="42.5" y="26" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Escritório</text>

            {/* Corredor */}
            <rect x="25" y="40" width="15" height="25" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="32.5" y="53" fill="hsl(var(--muted-foreground))" fontSize="1.5" textAnchor="middle">Corredor</text>

            {/* Linha de Produção */}
            <rect x="50" y="25" width="35" height="30" fill="hsl(var(--warning) / 0.1)" stroke="hsl(var(--warning) / 0.3)" strokeWidth="0.3" rx="0.5" />
            <text x="67.5" y="41" fill="hsl(var(--foreground))" fontSize="2" textAnchor="middle" className="font-medium">Linha de Produção</text>

            {/* Almoxarifado */}
            <rect x="75" y="55" width="20" height="25" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="85" y="68" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Almoxarifado</text>

            {/* Refeitório */}
            <rect x="25" y="70" width="25" height="20" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="37.5" y="81" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Refeitório</text>

            {/* Estacionamento */}
            <rect x="2" y="60" width="18" height="35" fill="hsl(var(--secondary))" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="11" y="78" fill="hsl(var(--muted-foreground))" fontSize="1.8" textAnchor="middle">Estacionamento</text>

            {/* Área de Carga */}
            <rect x="85" y="78" width="12" height="18" fill="hsl(var(--primary) / 0.08)" stroke="hsl(var(--border))" strokeWidth="0.2" rx="0.5" />
            <text x="91" y="88" fill="hsl(var(--muted-foreground))" fontSize="1.5" textAnchor="middle">Doca</text>
          </svg>

          {/* Camera Markers */}
          {filteredCameras.map(camera => {
            const position = cameraPositions[camera.id];
            if (!position) return null;

            const isHovered = hoveredCamera === camera.id;
            const hasAlert = camera.status === 'alert' || camera.status === 'warning';

            return (
              <Tooltip key={camera.id}>
                <TooltipTrigger asChild>
                  <button
                    className={`
                      absolute transform -translate-x-1/2 -translate-y-1/2 
                      transition-all duration-300 z-10
                      ${isHovered ? 'scale-150' : 'scale-100'}
                    `}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    }}
                    onMouseEnter={() => setHoveredCamera(camera.id)}
                    onMouseLeave={() => setHoveredCamera(null)}
                    onClick={() => setSelectedCamera(camera)}
                  >
                    {/* Camera View Cone */}
                    <div
                      className={`
                        absolute w-16 h-16 -left-8 -top-8
                        opacity-20 transition-opacity duration-300
                        ${isHovered ? 'opacity-40' : ''}
                        ${camera.status === 'offline' ? 'opacity-5' : ''}
                      `}
                      style={{
                        background: `conic-gradient(from ${position.rotation - 45}deg, transparent 0deg, ${
                          camera.status === 'alert' ? 'hsl(var(--destructive))' :
                          camera.status === 'warning' ? 'hsl(var(--warning))' :
                          camera.status === 'offline' ? 'hsl(var(--muted-foreground))' :
                          'hsl(var(--primary))'
                        } 45deg, transparent 90deg)`,
                        transform: `rotate(${position.rotation}deg)`,
                        borderRadius: '50%',
                      }}
                    />

                    {/* Camera Icon */}
                    <div
                      className={`
                        relative w-8 h-8 rounded-full flex items-center justify-center
                        border-2 border-background
                        ${statusColors[camera.status]}
                        ${statusGlow[camera.status]}
                        transition-all duration-300
                      `}
                    >
                      <Camera className="w-4 h-4 text-white" />
                      
                      {/* Alert Badge */}
                      {hasAlert && camera.alerts && camera.alerts > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                          {camera.alerts}
                        </span>
                      )}
                    </div>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card border-border">
                  <div className="text-sm">
                    <p className="font-semibold">{camera.name}</p>
                    <p className="text-muted-foreground text-xs">{camera.location}</p>
                    {camera.detectedPeople !== undefined && camera.detectedPeople > 0 && (
                      <p className="text-xs mt-1">{camera.detectedPeople} pessoas detectadas</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Camera List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 animate-fade-in-delay-2">
        {mockCameras.map(camera => (
          <button
            key={camera.id}
            onClick={() => setSelectedCamera(camera)}
            className={`
              glass-card p-3 flex items-center gap-3 text-left transition-all duration-200
              hover:bg-secondary/50
              ${camera.status === 'alert' ? 'border-destructive/50' : ''}
              ${camera.status === 'warning' ? 'border-warning/50' : ''}
            `}
          >
            <div className={`w-3 h-3 rounded-full ${statusColors[camera.status]} ${camera.status === 'alert' ? 'animate-pulse' : ''}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{camera.name}</p>
              <p className="text-xs text-muted-foreground truncate">{camera.location}</p>
            </div>
            {camera.alerts !== undefined && camera.alerts > 0 && (
              <Badge variant="alert" className="text-xs">
                {camera.alerts}
              </Badge>
            )}
          </button>
        ))}
      </div>

      {/* Camera Modal */}
      {selectedCamera && (
        <CameraModal
          camera={selectedCamera}
          isOpen={!!selectedCamera}
          onClose={() => setSelectedCamera(null)}
        />
      )}
    </div>
  );
}
