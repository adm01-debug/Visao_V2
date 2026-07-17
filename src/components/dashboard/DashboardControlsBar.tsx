import { memo } from 'react';
import { Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CameraLayoutControls, CameraLayout } from '@/components/CameraLayoutControls';
import { SearchInput } from '@/components/SearchInput';
import { EventSimulator } from './EventSimulator';

interface DashboardControlsBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  enableStreams: boolean;
  onEnableStreamsChange: (value: boolean) => void;
  cameraLayout: CameraLayout;
  onLayoutChange: (layout: CameraLayout) => void;
  showMap: boolean;
  onShowMapChange: (value: boolean) => void;
  simulatorCameras?: { id: string; name: string }[];
}


function DashboardControlsBarComponent({
  searchQuery, onSearchChange,
  enableStreams, onEnableStreamsChange,
  cameraLayout, onLayoutChange,
  showMap, onShowMapChange,
  simulatorCameras = [],
}: DashboardControlsBarProps) {

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2">
      <SearchInput value={searchQuery} onChange={onSearchChange} placeholder="Buscar câmeras e alertas..." />
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-sm">
          <Switch id="enable-streams" checked={enableStreams} onCheckedChange={onEnableStreamsChange} />
          <Label htmlFor="enable-streams" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">Streams</Label>
        </div>
        <div className="h-4 w-px bg-border/50" />
        <CameraLayoutControls layout={cameraLayout} onLayoutChange={onLayoutChange} />
        <EventSimulator cameras={simulatorCameras} />
        <Tooltip>
          <TooltipTrigger asChild>

            <Button
              variant={showMap ? 'default' : 'ghost'}
              size="icon" className="h-8 w-8 rounded-lg"
              onClick={() = onShowMapChange(!showMap)}
            >
              <Map className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mapa</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export const DashboardControlsBar = memo(DashboardControlsBarComponent);
