import { useCallback, useEffect, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Focus,
  Aperture,
  Home,
  Square,
  Star,
  Trash2,
  Play,
  Wand2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PtzJoystick } from './PtzJoystick';
import { PtzSetupWizard } from './PtzSetupWizard';
import { usePtzControl } from '@/hooks/usePtzControl';

interface PtzControlPanelProps {
  cameraId: string;
  cameraName?: string;
}

/**
 * PtzControlPanel — mesa de operação CFTV: joystick, botões direcionais,
 * zoom/foco/íris, presets e patrulhas. Integra atalhos de teclado.
 */
export function PtzControlPanel({ cameraId, cameraName }: PtzControlPanelProps) {
  const ptz = usePtzControl({ cameraId });
  const [speed, setSpeed] = useState(5);
  const [zoomVal, setZoomVal] = useState(0);
  const [savingPreset, setSavingPreset] = useState<{ n: number; name: string } | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);

  const nudge = useCallback(
    async (pan: number, tilt: number) => {
      await ptz.startMove({ pan, tilt, speed });
      setTimeout(() => void ptz.stopMove(), 350);
    },
    [ptz, speed]
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const k = e.key;
      if (k === 'ArrowUp') {
        e.preventDefault();
        void nudge(0, 1);
      } else if (k === 'ArrowDown') {
        e.preventDefault();
        void nudge(0, -1);
      } else if (k === 'ArrowLeft') {
        e.preventDefault();
        void nudge(-1, 0);
      } else if (k === 'ArrowRight') {
        e.preventDefault();
        void nudge(1, 0);
      } else if (k === '+' || k === '=') {
        void ptz.zoom(0.5, speed);
      } else if (k === '-') {
        void ptz.zoom(-0.5, speed);
      } else if (k === 'h' || k === 'H') {
        void ptz.home();
      } else if (k === 'Escape') {
        void ptz.stopMove();
      } else if (/^[1-9]$/.test(k) && !e.shiftKey) {
        void ptz.gotoPreset(Number(k));
      } else if (/^[1-9]$/.test(k) && e.shiftKey) {
        setSavingPreset({ n: Number(k), name: `Preset ${k}` });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [nudge, ptz, speed]);

  const locked =
    ptz.lockInfo && ptz.lockInfo.expires_at && new Date(ptz.lockInfo.expires_at) > new Date();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            Controle PTZ{' '}
            {cameraName && (
              <span className="text-muted-foreground font-normal">— {cameraName}</span>
            )}
          </CardTitle>
          {locked && (
            <p className="text-xs text-muted-foreground mt-1">
              Em uso por{' '}
              <span className="font-medium text-foreground">
                {ptz.lockInfo?.user_email ?? 'outro operador'}
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ptz.isMoving && (
            <Badge variant="secondary" className="animate-pulse">
              Movendo
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => setWizardOpen(true)}>
            <Wand2 className="w-4 h-4 mr-1" />
            Configuração assistida
          </Button>
          <Button variant="destructive" size="sm" onClick={() => void ptz.stopMove()}>
            <Square className="w-4 h-4 mr-1" />
            Stop
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6">
          {/* Joystick + botões direcionais */}
          <div className="flex flex-col items-center gap-3">
            <PtzJoystick
              onChange={({ pan, tilt, magnitude }) => {
                if (magnitude > 0.05) void ptz.startMove({ pan, tilt, speed });
              }}
              onRelease={() => void ptz.stopMove()}
            />
            <div className="grid grid-cols-3 gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(-0.7, 0.7)}
                aria-label="Cima-esquerda"
              >
                ↖
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(0, 1)}
                aria-label="Cima"
              >
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(0.7, 0.7)}
                aria-label="Cima-direita"
              >
                ↗
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(-1, 0)}
                aria-label="Esquerda"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void ptz.home()}
                aria-label="Home"
              >
                <Home className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(1, 0)}
                aria-label="Direita"
              >
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(-0.7, -0.7)}
                aria-label="Baixo-esquerda"
              >
                ↙
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(0, -1)}
                aria-label="Baixo"
              >
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => void nudge(0.7, -0.7)}
                aria-label="Baixo-direita"
              >
                ↘
              </Button>
            </div>
          </div>

          {/* Zoom / Foco / Íris / Velocidade */}
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Velocidade</span>
                <span className="font-mono font-medium">{speed}</span>
              </div>
              <Slider
                value={[speed]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setSpeed(v ?? 5)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <ZoomIn className="w-3.5 h-3.5" /> Zoom
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void ptz.zoom(-0.5, speed)}
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void ptz.zoom(0.5, speed)}
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <Slider
                value={[zoomVal]}
                min={-100}
                max={100}
                step={5}
                onValueChange={([v]) => {
                  setZoomVal(v ?? 0);
                  void ptz.zoom((v ?? 0) / 100, speed);
                }}
                onValueCommit={() => {
                  setZoomVal(0);
                  void ptz.send('stop');
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1">
                <Focus className="w-4 h-4 text-muted-foreground" />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void ptz.focus(-0.5)}
                >
                  Foco –
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void ptz.focus(0.5)}
                >
                  Foco +
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Aperture className="w-4 h-4 text-muted-foreground" />
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void ptz.send('iris', { iris: -0.5 })}
                >
                  Íris –
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => void ptz.send('iris', { iris: 0.5 })}
                >
                  Íris +
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Presets */}
        <Tabs defaultValue="presets">
          <TabsList>
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="shortcuts">Atalhos</TabsTrigger>
          </TabsList>
          <TabsContent value="presets" className="pt-3">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
              {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => {
                const preset = ptz.presets.find((p: any) => p.preset_number === n);
                return (
                  <div key={n} className="relative group">
                    <Button
                      variant={preset ? 'default' : 'outline'}
                      size="sm"
                      className="w-full h-14 flex-col gap-0.5"
                      onClick={() =>
                        preset
                          ? void ptz.gotoPreset(n)
                          : setSavingPreset({ n, name: `Preset ${n}` })
                      }
                      title={preset?.name ?? 'Vazio — clique para salvar'}
                    >
                      <span className="text-xs font-mono">{n}</span>
                      <span className="text-[10px] truncate max-w-full">
                        {preset?.name ?? 'vazio'}
                      </span>
                      {preset?.is_home && (
                        <Star className="absolute top-0.5 right-0.5 w-3 h-3 text-warning fill-warning" />
                      )}
                    </Button>
                    {preset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          void ptz.deletePreset(n);
                        }}
                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-destructive text-destructive-foreground rounded-full p-0.5 transition-opacity"
                        aria-label={`Remover preset ${n}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </TabsContent>
          <TabsContent value="shortcuts" className="pt-3 text-sm text-muted-foreground space-y-1">
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">↑ ↓ ← →</kbd> —
              mover
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">+ / −</kbd> — zoom
              in/out
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">1-9</kbd> — ir para
              preset
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Shift + 1-9</kbd> —
              salvar preset
            </p>
            <p>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">H</kbd> — home ·{' '}
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono text-xs">Esc</kbd> — parar
            </p>
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Save preset dialog */}
      <Dialog open={!!savingPreset} onOpenChange={(o) => !o && setSavingPreset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar preset {savingPreset?.n}</DialogTitle>
          </DialogHeader>
          <Input
            value={savingPreset?.name ?? ''}
            onChange={(e) => setSavingPreset((s) => s && { ...s, name: e.target.value })}
            placeholder="Nome do preset"
            maxLength={60}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSavingPreset(null)}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!savingPreset) return;
                await ptz.savePreset(
                  savingPreset.n,
                  savingPreset.name.trim() || `Preset ${savingPreset.n}`
                );
                setSavingPreset(null);
              }}
            >
              <Play className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
