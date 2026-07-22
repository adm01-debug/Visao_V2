/**
 * CameraDetailView - Modal fullscreen para visualização detalhada de câmera
 */

import { useState, useEffect } from 'react';
import {
  Camera, X, MapPin, Volume2, VolumeX, ChevronLeft, ChevronRight,
  Target, ScanFace, Brain, AlertTriangle, Gamepad2,
} from 'lucide-react';
import { PtzControlPanel } from '@/components/ptz/PtzControlPanel';
import { QuickPtzBar } from '@/components/ptz/QuickPtzBar';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { ClipRecorderControls } from '@/components/ClipRecorderControls';
import { FaceRecognitionOverlay } from '@/components/FaceRecognitionOverlay';
import { ZoneOverlay } from '@/components/ZoneOverlay';
import { ArmDisarmControl } from '@/components/ArmDisarmControl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CameraTestHistoryCard } from './CameraTestHistoryCard';
import type { CameraData } from './types';

interface CameraDetailViewProps {
  camera: CameraData;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export function CameraDetailView({
  camera, isOpen, onClose, onPrev, onNext, hasPrev, hasNext,
}: CameraDetailViewProps) {
  const [activeTab, setActiveTab] = useState('live');
  const [isMuted, setIsMuted] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showFaces, setShowFaces] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onPrev?.();
      if (e.key === 'ArrowRight' && hasNext) onNext?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, onClose, onPrev, onNext]);

  if (!camera) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[95vh] p-0 overflow-hidden">
        <div className="flex h-[90vh]">
          {/* Main Video Area */}
          <div className="flex-1 flex flex-col bg-foreground relative">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-foreground font-bold text-lg">{camera.name}</h2>
                  {camera.location && (
                    <p className="text-foreground/70 text-sm flex items-center gap-1">
                      <MapPin className="w-3 h-3" />{camera.location}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <ArmDisarmControl cameraId={camera.id} cameraName={camera.name} compact />
                  <Badge variant={camera.status !== 'offline' ? 'default' : 'secondary'}>
                    {camera.status !== 'offline' ? 'Online' : 'Offline'}
                  </Badge>
                  <Button aria-label="Fechar" variant="ghost" size="icon" className="text-foreground" onClick={onClose}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Video */}
            <div className="flex-1 relative">
              {camera.stream_url ? (
                <>
                  <VideoStreamPlayer
                    cameraId={camera.id} streamUrl={camera.stream_url}
                    protocol="hls" cameraName={camera.name} className="w-full h-full"
                  />
                  {showZones && <ZoneOverlay zones={[]} showLabels showStats />}
                  {showFaces && <FaceRecognitionOverlay faces={[]} showLabels showSimilarity />}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-foreground/70">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Stream não disponível</p>
                  </div>
                </div>
              )}

              {hasPrev && (
                <Button variant="ghost" size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-background bg-foreground/50 hover:bg-foreground/70"
                  onClick={onPrev} aria-label="Anterior">
                  <ChevronLeft className="w-6 h-6" />
                </Button>
              )}
              {hasNext && (
                <Button variant="ghost" size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-background bg-foreground/50 hover:bg-foreground/70"
                  onClick={onNext} aria-label="Próximo">
                  <ChevronRight className="w-6 h-6" />
                </Button>
              )}

              {camera.ptz_capable && (
                <div className="pointer-events-none absolute right-4 top-20 z-10">
                  <QuickPtzBar cameraId={camera.id} keyboardEnabled={isOpen} />
                </div>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="text-foreground" onClick={() => setIsMuted(!isMuted)}>
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  <ClipRecorderControls cameraId={camera.id} cameraName={camera.name} compact />
                </div>
                <div className="flex items-center gap-2">
                  <Button variant={showZones ? 'secondary' : 'ghost'} size="sm" className="text-foreground"
                    onClick={() => setShowZones(!showZones)}>
                    <Target className="w-4 h-4 mr-1" />Zonas
                  </Button>
                  <Button variant={showFaces ? 'secondary' : 'ghost'} size="sm" className="text-foreground"
                    onClick={() => setShowFaces(!showFaces)}>
                    <ScanFace className="w-4 h-4 mr-1" />Faces
                  </Button>
                  <Button variant={showAnalysis ? 'secondary' : 'ghost'} size="sm" className="text-foreground"
                    onClick={() => setShowAnalysis(!showAnalysis)}>
                    <Brain className="w-4 h-4 mr-1" />IA
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-background border-l flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 grid grid-cols-5">
                <TabsTrigger value="live">Ao Vivo</TabsTrigger>
                <TabsTrigger value="ptz"><Gamepad2 className="w-3.5 h-3.5" /></TabsTrigger>
                <TabsTrigger value="tests">Testes</TabsTrigger>
                <TabsTrigger value="alerts">Alertas</TabsTrigger>
                <TabsTrigger value="config">Config</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 p-4">
                <TabsContent value="live" className="m-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Status</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Resolução</span><span>1920x1080</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">FPS</span><span>30</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Protocolo</span><span className="uppercase">HLS</span></div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Estatísticas Hoje</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-2">
                      {[
                        { value: '0', label: 'Alertas' },
                        { value: '0', label: 'Pessoas' },
                        { value: '0', label: 'Análises' },
                        { value: '0min', label: 'Gravado' },
                      ].map(s => (
                        <div key={s.label} className="p-2 bg-muted rounded text-center">
                          <p className="text-lg font-bold">{s.value}</p>
                          <p className="text-[10px] text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ptz" className="m-0">
                  <PtzControlPanel cameraId={camera.id} cameraName={camera.name} />
                </TabsContent>


                <TabsContent value="alerts" className="m-0">
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Nenhum alerta recente</p>
                  </div>
                </TabsContent>

                <TabsContent value="config" className="m-0 space-y-4">
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-sm">Funcionalidades</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      {['Análise de IA', 'Reconhecimento Facial', 'Zonas de Interesse', 'Áudio'].map(feat => (
                        <div key={feat} className="flex items-center justify-between">
                          <Label className="text-sm">{feat}</Label>
                          <Switch defaultChecked={false} />
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
