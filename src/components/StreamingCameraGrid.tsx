/**
 * VISÃO - StreamingCameraGrid (Refactored)
 * CameraTile extracted to ./streaming/CameraTile.tsx
 */
import { useMediaQuery, useWindowSize } from "@/hooks";
import { useState, useMemo } from 'react';
import { Grid2X2, Grid3X3, LayoutGrid, List, X, ChevronLeft, ChevronRight, Camera as CameraIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { VideoStreamPlayer } from './VideoStreamPlayer';
import { DbCamera } from '@/hooks/useCameras';
import { CameraTile } from './streaming/CameraTile';

type GridLayout = '2x2' | '3x3' | '4x4' | 'list' | 'single';

interface StreamingCameraGridProps {
  cameras: DbCamera[];
  initialLayout?: GridLayout;
  showLayoutControls?: boolean;
  maxHeight?: string | number;
  onCameraSelect?: (camera: DbCamera) => void;
  onSnapshot?: (cameraId: string, imageData: string) => void;
  className?: string;
}

function LayoutSelector({ current, onChange }: { current: GridLayout; onChange: (l: GridLayout) => void }) {
  const layouts: { value: GridLayout; icon: React.ReactNode; label: string }[] = [
    { value: '2x2', icon: <Grid2X2 className="w-4 h-4" />, label: '2x2' },
    { value: '3x3', icon: <Grid3X3 className="w-4 h-4" />, label: '3x3' },
    { value: '4x4', icon: <LayoutGrid className="w-4 h-4" />, label: '4x4' },
    { value: 'list', icon: <List className="w-4 h-4" />, label: 'Lista' },
  ];
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
        {layouts.map(({ value, icon, label }) => (
          <Tooltip key={value}>
            <TooltipTrigger asChild>
              <Button variant={current === value ? 'default' : 'ghost'} size="sm" className="h-8 w-8 p-0" onClick={() => onChange(value)}>{icon}</Button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function StreamingCameraGrid({ cameras, initialLayout = '2x2', showLayoutControls = true, maxHeight, onCameraSelect, onSnapshot, className }: StreamingCameraGridProps) {
  const [layout, setLayout] = useState<GridLayout>(initialLayout);
  const [selectedCamera, setSelectedCamera] = useState<DbCamera | null>(null);
  const [expandedCamera, setExpandedCamera] = useState<DbCamera | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const camerasPerPage = useMemo(() => {
    const map: Record<GridLayout, number> = { '2x2': 4, '3x3': 9, '4x4': 16, list: 10, single: 1 };
    return map[layout] || 4;
  }, [layout]);

  const totalPages = Math.ceil(cameras.length / camerasPerPage);
  const paginatedCameras = useMemo(() => cameras.slice(currentPage * camerasPerPage, (currentPage + 1) * camerasPerPage), [cameras, currentPage, camerasPerPage]);

  const gridClass = useMemo(() => {
    const map: Record<GridLayout, string> = {
      '2x2': 'grid grid-cols-1 sm:grid-cols-2 gap-4',
      '3x3': 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3',
      '4x4': 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2',
      list: 'flex flex-col gap-2',
      single: '',
    };
    return map[layout] || 'grid grid-cols-2 gap-4';
  }, [layout]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CameraIcon className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold">Câmeras ao Vivo</h2>
          <Badge variant="secondary">{cameras.length}</Badge>
        </div>
        <div className="flex items-center gap-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}><ChevronLeft className="w-4 h-4" /></Button>
              <span className="text-sm text-muted-foreground">{currentPage + 1} / {totalPages}</span>
              <Button variant="ghost" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1}><ChevronRight className="w-4 h-4" /></Button>
            </div>
          )}
          {showLayoutControls && <LayoutSelector current={layout} onChange={setLayout} />}
        </div>
      </div>

      <div className={gridClass} style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}>
        {paginatedCameras.map(camera => (
          <CameraTile key={camera.id} camera={camera} isSelected={selectedCamera?.id === camera.id} showStream compact={layout === 'list'}
            onSelect={() => { setSelectedCamera(camera); onCameraSelect?.(camera); }} onExpand={() => setExpandedCamera(camera)} />
        ))}
      </div>

      {cameras.length === 0 && (
        <div className="text-center py-12"><CameraIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" /><p className="text-muted-foreground">Nenhuma câmera cadastrada</p></div>
      )}

      <Dialog open={!!expandedCamera} onOpenChange={() => setExpandedCamera(null)}>
        <DialogContent className="max-w-5xl p-0 overflow-hidden">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">{expandedCamera?.name}</DialogTitle>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20" onClick={() => setExpandedCamera(null)}><X className="w-5 h-5" /></Button>
            </div>
          </DialogHeader>
          {expandedCamera && <VideoStreamPlayer cameraId={expandedCamera.id} cameraName={expandedCamera.name} location={expandedCamera.location} showStats onSnapshot={(data) => onSnapshot?.(expandedCamera.id, data)} height={600} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default StreamingCameraGrid;
