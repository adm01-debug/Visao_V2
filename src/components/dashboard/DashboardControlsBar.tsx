import { memo } from 'react';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CameraLayoutControls, CameraLayout } from '@/components/CameraLayoutControls';
import { SearchInput } from '@/components/SearchInput';

interface DashboardControlsBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  enableStreams: boolean;
  onEnableStreamsChange: (value: boolean) => void;
  cameraLayout: CameraLayout;
  onLayoutChange: (layout: CameraLayout) => void;
  showMap: boolean;
  onShowMapChange: (value: boolean) => void;
}

function DashboardControlsBarComponent({
  searchQuery, onSearchChange,
  enableStreams, onEnableStreamsChange,
  cameraLayout, onLayoutChange,
  showMap, onShowMapChange,
}: DashboardControlsBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <SearchInput value={searchQuery} onChange={onSearchChange} placeholder="Buscar câmeras ou alertas..." />
        <div className="flex items-center gap-2">
          <Switch id="enable-streams" checked={enableStreams} onCheckedChange={onEnableStreamsChange} />
          <Label htmlFor="enable-streams" className="text-sm cursor-pointer">Streams ao vivo</Label>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <CameraLayoutControls layout={cameraLayout} onLayoutChange={onLayoutChange} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={showMap ? 'default' : 'outline'}
              size="icon" className="h-8 w-8"
              onClick={() => onShowMapChange(!showMap)}
            >
              <Map className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mostrar Mapa</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export const DashboardControlsBar = memo(DashboardControlsBarComponent);
