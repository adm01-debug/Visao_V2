import { useState } from 'react';
import { X, ExternalLink, Settings, Bell, History, MapPin, Save } from 'lucide-react';
import { Camera } from '@/types/surveillance';
import { VideoPlayer } from './VideoPlayer';
import { EventTimeline } from './EventTimeline';
import { StatusIndicator } from './StatusIndicator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExtendedCamera extends Camera {
  latitude?: number | null;
  longitude?: number | null;
}

interface CameraModalProps {
  camera: ExtendedCamera;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCoordinates?: (id: string, latitude: number | null, longitude: number | null) => Promise<void>;
}

export function CameraModal({ camera, isOpen, onClose, onUpdateCoordinates }: CameraModalProps) {
  const [latitude, setLatitude] = useState<string>(camera.latitude?.toString() || '');
  const [longitude, setLongitude] = useState<string>(camera.longitude?.toString() || '');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSaveCoordinates = async () => {
    if (!onUpdateCoordinates) return;
    
    setSaving(true);
    try {
      const lat = latitude ? parseFloat(latitude) : null;
      const lng = longitude ? parseFloat(longitude) : null;
      
      if (latitude && isNaN(lat!)) {
        return;
      }
      if (longitude && isNaN(lng!)) {
        return;
      }
      
      await onUpdateCoordinates(camera.id, lat, lng);
    } finally {
      setSaving(false);
    }
  };

  const hasCoordinatesChanged = 
    latitude !== (camera.latitude?.toString() || '') ||
    longitude !== (camera.longitude?.toString() || '');

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

                  {/* Coordinates Form */}
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary" />
                      <h4 className="font-semibold text-foreground">Localização no Mapa</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="latitude" className="text-xs text-muted-foreground">
                          Latitude
                        </Label>
                        <Input
                          id="latitude"
                          type="number"
                          step="any"
                          placeholder="-23.5505"
                          value={latitude}
                          onChange={(e) => setLatitude(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="longitude" className="text-xs text-muted-foreground">
                          Longitude
                        </Label>
                        <Input
                          id="longitude"
                          type="number"
                          step="any"
                          placeholder="-46.6333"
                          value={longitude}
                          onChange={(e) => setLongitude(e.target.value)}
                          className="h-8 text-sm"
                        />
                      </div>
                      {onUpdateCoordinates && (
                        <Button
                          size="sm"
                          className="w-full gap-2"
                          onClick={handleSaveCoordinates}
                          disabled={saving || !hasCoordinatesChanged}
                        >
                          <Save className="w-4 h-4" />
                          {saving ? 'Salvando...' : 'Salvar Coordenadas'}
                        </Button>
                      )}
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
