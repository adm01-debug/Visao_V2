import { Target, Plus, RefreshCw, ChevronDown, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DbCamera } from '@/hooks/useCameras';

interface ZonesHeaderProps {
  totalCount: number;
  activeCount: number;
  loading: boolean;
  cameras: CameraType[];
  onRefresh: () => void;
  onNewZone: (camera: CameraType) => void;
}

export function ZonesHeader({ 
  totalCount, 
  activeCount, 
  loading, 
  cameras, 
  onRefresh, 
  onNewZone 
}: ZonesHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <Target className="w-6 h-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Zonas de Interesse</h1>
              <p className="text-muted-foreground mt-0.5 text-sm">
                {loading ? '— zonas • — ativas' : `${totalCount} zonas • ${activeCount} ativas`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={onRefresh} 
              disabled={loading} 
              className="border-border/40"
              title="Atualizar dados"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={loading}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Zona
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {cameras.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground text-center">Nenhuma câmera disponível</div>
                ) : cameras.map(camera => (
                  <DropdownMenuItem key={camera.id} onClick={() => onNewZone(camera)}>
                    <Camera className="w-4 h-4 mr-2" />{camera.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
