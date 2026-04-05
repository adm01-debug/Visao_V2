import { Camera, CameraOff, Play, Pause, Settings, Volume2, VolumeX, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface LiveFaceConfig {
  captureInterval: number;
  matchThreshold: number;
  alertOnUnknown: boolean;
  alertOnBlacklist: boolean;
}

interface LiveFaceControlsProps {
  isCameraOn: boolean;
  isRunning: boolean;
  isFullscreen: boolean;
  soundEnabled: boolean;
  config: LiveFaceConfig;
  onToggleCamera: () => void;
  onToggleRecognition: () => void;
  onToggleSound: () => void;
  onToggleFullscreen: () => void;
  onConfigChange: (config: LiveFaceConfig) => void;
  onClearFaces: () => void;
  onResetStats: () => void;
}

export function LiveFaceControls({
  isCameraOn, isRunning, isFullscreen, soundEnabled, config,
  onToggleCamera, onToggleRecognition, onToggleSound, onToggleFullscreen,
  onConfigChange, onClearFaces, onResetStats,
}: LiveFaceControlsProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
      <Button variant={isCameraOn ? 'default' : 'secondary'} size="icon" onClick={onToggleCamera}>
        {isCameraOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
      </Button>

      <Button variant={isRunning ? 'destructive' : 'default'} size="lg" onClick={onToggleRecognition} disabled={!isCameraOn}>
        {isRunning ? <><Pause className="w-5 h-5 mr-2" />Parar</> : <><Play className="w-5 h-5 mr-2" />Iniciar</>}
      </Button>

      <Button variant="ghost" size="icon" onClick={onToggleSound}>
        {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
      </Button>

      <Button variant="ghost" size="icon" onClick={onToggleFullscreen}>
        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="end">
          <div className="space-y-4">
            <h4 className="font-medium">Configurações</h4>
            <div className="space-y-2">
              <Label>Intervalo de captura: {config.captureInterval / 1000}s</Label>
              <Slider value={[config.captureInterval]} min={500} max={5000} step={500}
                onValueChange={([v]) => onConfigChange({ ...config, captureInterval: v ?? config.captureInterval })} />
            </div>
            <div className="space-y-2">
              <Label>Threshold de similaridade: {Math.round(config.matchThreshold * 100)}%</Label>
              <Slider value={[config.matchThreshold * 100]} min={30} max={95} step={5}
                onValueChange={([v]) => onConfigChange({ ...config, matchThreshold: v! / 100 })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Alertar desconhecidos</Label>
              <Switch checked={config.alertOnUnknown} onCheckedChange={(v) => onConfigChange({ ...config, alertOnUnknown: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Alertar bloqueados</Label>
              <Switch checked={config.alertOnBlacklist} onCheckedChange={(v) => onConfigChange({ ...config, alertOnBlacklist: v })} />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" size="sm" onClick={onClearFaces}>Limpar faces</Button>
              <Button variant="outline" size="sm" onClick={onResetStats}>Resetar stats</Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
