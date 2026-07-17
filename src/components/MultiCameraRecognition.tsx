/**
 * VISÃO - Multi Camera Recognition (Refactored)
 */
import { memo } from 'react';
import { Camera, Play, Pause, Settings, Grid, LayoutGrid, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useMultiCameraRecognition, type LayoutType } from '@/hooks/useMultiCameraRecognition';
import { CameraFeedCard } from './recognition/CameraFeedCard';
import { DetectionSidebar } from './recognition/DetectionSidebar';

function MultiCameraRecognitionComponent() {
  const {
    cameras, activeFeeds, activeCameras, layout, setLayout,
    captureInterval, setCaptureInterval, matchThreshold, setMatchThreshold,
    soundEnabled, setSoundEnabled, isGlobalRunning, recognitionResults,
    fullscreenCamera, setFullscreenCamera, personsCache,
    toggleCamera, startAllCameras, stopAllCameras, handleVideoLoaded,
    getLayoutClass, getMaxCameras, analyzingIds,
  } = useMultiCameraRecognition();

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Camera className="h-5 w-5" />Multi-Câmeras ({activeFeeds.size}/{getMaxCameras()})</h2>
          <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
            <SelectTrigger className="w-32"><LayoutGrid className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1x1">1 Câmera</SelectItem>
              <SelectItem value="2x2">2x2 Grid</SelectItem>
              <SelectItem value="3x3">3x3 Grid</SelectItem>
              <SelectItem value="4x4">4x4 Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() = aria-label="Som ligado"> setSoundEnabled(!soundEnabled)} aria-label={soundEnabled ? "Desativar som" : "Ativar som"} aria-pressed={soundEnabled}>
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Settings className="h-4 w-4 mr-2" />Configurações</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Configurações de Análise</DialogTitle></DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Intervalo de Captura: {captureInterval / 1000}s</Label>
                  <Slider value={[captureInterval]} onValueChange={([v]) => setCaptureInterval(v!)} min={1000} max={10000} step={500} />
                </div>
                <div className="space-y-2">
                  <Label>Limiar de Similaridade: {(matchThreshold * 100).toFixed(0)}%</Label>
                  <Slider value={[matchThreshold * 100]} onValueChange={([v]) => setMatchThreshold(v! / 100)} min={30} max={95} step={5} />
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" size="sm"><Grid className="h-4 w-4 mr-2" />Selecionar Câmeras</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Selecionar Câmeras</DialogTitle></DialogHeader>
              <ScrollArea className="h-80">
                <div className="space-y-2 p-1">
                  {cameras?.map(camera => (
                    <div key={camera.id} className={cn('flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors', activeFeeds.has(camera.id) ? 'bg-primary/10 border-primary' : 'hover:bg-muted')} onClick={() => toggleCamera(camera.id)}>
                      <div className="flex items-center gap-3">
                        <div className={cn('w-2 h-2 rounded-full', camera.status === 'online' ? 'bg-success' : 'bg-destructive')} />
                        <div><p className="font-medium">{camera.name}</p><p className="text-xs text-muted-foreground">{camera.location}</p></div>
                      </div>
                      <Switch checked={activeFeeds.has(camera.id)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          {isGlobalRunning ? (
            <Button variant="destructive" size="sm" onClick={stopAllCameras}><Pause className="h-4 w-4 mr-2" />Pausar Todas</Button>
          ) : (
            <Button size="sm" onClick={startAllCameras} disabled={activeFeeds.size === 0}><Play className="h-4 w-4 mr-2" />Iniciar Todas</Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 overflow-auto">
          {activeFeeds.size === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center"><Camera className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-lg font-medium">Nenhuma câmera selecionada</h3><p className="text-muted-foreground">Clique em "Selecionar Câmeras" para adicionar feeds</p></div>
            </div>
          ) : (
            <div className={cn('grid gap-4 h-full', getLayoutClass())}>
              {activeCameras.map(camera => (
                <CameraFeedCard key={camera.id} camera={camera} isAnalyzing={analyzingIds.has(camera.id)}
                  onVideoLoaded={(video) => handleVideoLoaded(camera.id, video)} onRemove={() => toggleCamera(camera.id)}
                  onFullscreen={() => setFullscreenCamera(camera.id)} recentDetections={recognitionResults.filter(r => r.cameraId === camera.id).slice(0, 3)} />
              ))}
            </div>
          )}
        </div>
        <DetectionSidebar results={recognitionResults} personsCache={personsCache} />
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <Dialog open={!!fullscreenCamera} onOpenChange={() => setFullscreenCamera(null)}>
          <DialogContent className="max-w-6xl h-[90vh]">
            <DialogHeader><DialogTitle>{cameras?.find(c => c.id === fullscreenCamera)?.name}</DialogTitle></DialogHeader>
            <div className="flex-1 bg-foreground rounded-lg overflow-hidden">
              {cameras?.find(c => c.id === fullscreenCamera)?.stream_url ? (
                <video src={cameras.find(c => c.id === fullscreenCamera)?.stream_url || ''} autoPlay muted playsInline className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem stream disponível</div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export const MultiCameraRecognition = memo(MultiCameraRecognitionComponent);
