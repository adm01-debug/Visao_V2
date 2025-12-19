import { X, ExternalLink, Settings, Bell, History } from 'lucide-react';
import { Camera } from '@/types/surveillance';
import { VideoPlayer } from './VideoPlayer';
import { EventTimeline } from './EventTimeline';
import { StatusIndicator } from './StatusIndicator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface CameraModalProps {
  camera: Camera;
  isOpen: boolean;
  onClose: () => void;
}

export function CameraModal({ camera, isOpen, onClose }: CameraModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-6xl max-h-[90vh] mx-4 glass-card overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-4">
            <StatusIndicator status={camera.status} size="lg" />
            <div>
              <h2 className="text-xl font-bold text-foreground">{camera.name}</h2>
              <p className="text-sm text-muted-foreground">{camera.location}</p>
            </div>
            {camera.alerts && camera.alerts > 0 && (
              <Badge variant="destructive" className="gap-1">
                {camera.alerts} alertas ativos
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
              <ExternalLink className="w-5 h-5 text-muted-foreground" />
            </button>
            <button 
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-secondary transition-colors ml-2"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2">
              <VideoPlayer
                cameraName={camera.name}
                cameraLocation={camera.location}
                isLive={camera.status === 'online'}
              />
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Tabs defaultValue="events" className="w-full">
                <TabsList className="w-full bg-secondary">
                  <TabsTrigger value="events" className="flex-1 gap-2">
                    <History className="w-4 h-4" />
                    Eventos
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex-1 gap-2">
                    <Settings className="w-4 h-4" />
                    Info
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="events" className="mt-4">
                  <EventTimeline />
                </TabsContent>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="glass-card p-4 space-y-3">
                    <h4 className="font-semibold text-foreground">Informações da Câmera</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">ID</span>
                        <span className="font-mono text-foreground">{camera.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <StatusIndicator status={camera.status} showLabel />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pessoas detectadas</span>
                        <span className="text-foreground">{camera.detectedPeople || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Resolução</span>
                        <span className="text-foreground">1920x1080</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">FPS</span>
                        <span className="text-foreground">30</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protocolo</span>
                        <span className="text-foreground">RTSP</span>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-4 space-y-3">
                    <h4 className="font-semibold text-foreground">Análise AI</h4>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Modelo</span>
                        <span className="text-foreground">YOLOv8</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Detecção de pessoas</span>
                        <Badge variant="success">Ativo</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Detecção de EPI</span>
                        <Badge variant="success">Ativo</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Zonas de alerta</span>
                        <span className="text-foreground">2 configuradas</span>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
