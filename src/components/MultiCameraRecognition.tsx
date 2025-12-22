import { useInterval, useTimeout } from "@/hooks";
import { memo } from "react";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Camera, 
  Play, 
  Pause, 
  Settings, 
  Maximize2, 
  Minimize2,
  Grid,
  LayoutGrid,
  Square,
  AlertTriangle,
  CheckCircle,
  X,
  Volume2,
  VolumeX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { playAlertSound, playCriticalAlertSound } from '@/lib/alertSounds';

interface CameraFeed {
  id: string;
  name: string;
  streamUrl: string | null;
  status: string;
  isAnalyzing: boolean;
  lastDetection?: {
    personName: string;
    confidence: number;
    isBlacklist: boolean;
    timestamp: Date;
  };
}

interface RecognitionResult {
  cameraId: string;
  cameraName: string;
  personId: string | null;
  personName: string;
  confidence: number;
  isBlacklist: boolean;
  timestamp: Date;
  imageUrl?: string;
}

type LayoutType = '1x1' | '2x2' | '3x3' | '4x4';

export function MultiCameraRecognition() {
  const [activeFeeds, setActiveFeeds] = useState<Set<string>>(new Set());
  const [layout, setLayout] = useState<LayoutType>('2x2');
  const [captureInterval, setCaptureInterval] = useState(3000);
  const [matchThreshold, setMatchThreshold] = useState(0.6);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isGlobalRunning, setIsGlobalRunning] = useState(false);
  const [recognitionResults, setRecognitionResults] = useState<RecognitionResult[]>([]);
  const [fullscreenCamera, setFullscreenCamera] = useState<string | null>(null);
  
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const intervalsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const personsCache = useRef<Map<string, { name: string; listType: string; photoUrl: string | null }>>(new Map());

  // Fetch cameras
  const { data: cameras, isLoading } = useQuery({
    queryKey: ['cameras-for-recognition'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch registered persons
  const { data: persons } = useQuery({
    queryKey: ['registered-persons-cache'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, list_type, photo_url');
      
      if (error) throw error;
      
      // Update cache
      data?.forEach(p => {
        personsCache.current.set(p.id, { 
          name: p.name, 
          listType: p.list_type || 'none',
          photoUrl: p.photo_url 
        });
      });
      
      return data || [];
    },
  });

  const getLayoutClass = () => {
    switch (layout) {
      case '1x1': return 'grid-cols-1';
      case '2x2': return 'grid-cols-1 md:grid-cols-2';
      case '3x3': return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case '4x4': return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const getMaxCameras = () => {
    switch (layout) {
      case '1x1': return 1;
      case '2x2': return 4;
      case '3x3': return 9;
      case '4x4': return 16;
      default: return 4;
    }
  };

  // Capture frame from video
  const captureFrame = useCallback((cameraId: string): string | null => {
    const video = videoRefs.current.get(cameraId);
    let canvas = canvasRefs.current.get(cameraId);

    if (!video || video.readyState < 2) return null;

    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRefs.current.set(cameraId, canvas);
    }

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Analyze frame
  const analyzeFrame = useCallback(async (cameraId: string, cameraName: string) => {
    const imageData = captureFrame(cameraId);
    if (!imageData) return;

    try {
      const { data, error } = await supabase.functions.invoke('compare-faces', {
        body: { 
          image: imageData,
          matchThreshold,
        },
      });

      if (error) {
        
        return;
      }

      if (data?.matches && data.matches.length > 0) {
        for (const match of data.matches) {
          const personInfo = personsCache.current.get(match.personId);
          const isBlacklist = personInfo?.listType === 'blacklist';

          const result: RecognitionResult = {
            cameraId,
            cameraName,
            personId: match.personId,
            personName: personInfo?.name || 'Desconhecido',
            confidence: match.similarity,
            isBlacklist,
            timestamp: new Date(),
            imageUrl: imageData,
          };

          setRecognitionResults(prev => [result, ...prev.slice(0, 49)]);

          // Alert for blacklist
          if (isBlacklist && soundEnabled) {
            playCriticalAlertSound();
            toast.error(`🚨 ALERTA: ${result.personName} na blacklist!`, {
              description: `Detectado em ${cameraName}`,
              duration: 10000,
            });
          }

          // Log to database
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            await supabase.from('recognition_logs').insert({
              camera_id: cameraId,
              person_id: match.personId,
              confidence: match.similarity,
              recognized: true,
              image_url: imageData,
              user_id: userData.user.id,
            });
          }
        }
      } else if (data?.facesDetected > 0) {
        // Unknown face detected
        const result: RecognitionResult = {
          cameraId,
          cameraName,
          personId: null,
          personName: 'Desconhecido',
          confidence: 0,
          isBlacklist: false,
          timestamp: new Date(),
        };

        setRecognitionResults(prev => [result, ...prev.slice(0, 49)]);
      }
    } catch (err) {
      
    }
  }, [captureFrame, matchThreshold, soundEnabled]);

  // Start analysis for a camera
  const startAnalysis = useCallback((cameraId: string, cameraName: string) => {
    if (intervalsRef.current.has(cameraId)) return;

    const interval = setInterval(() => {
      analyzeFrame(cameraId, cameraName);
    }, captureInterval);

    intervalsRef.current.set(cameraId, interval);
  }, [analyzeFrame, captureInterval]);

  // Stop analysis for a camera
  const stopAnalysis = useCallback((cameraId: string) => {
    const interval = intervalsRef.current.get(cameraId);
    if (interval) {
      clearInterval(interval);
      intervalsRef.current.delete(cameraId);
    }
  }, []);

  // Toggle camera
  const toggleCamera = (cameraId: string) => {
    setActiveFeeds(prev => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
        stopAnalysis(cameraId);
      } else if (next.size < getMaxCameras()) {
        next.add(cameraId);
      } else {
        toast.warning(`Máximo de ${getMaxCameras()} câmeras para este layout`);
      }
      return next;
    });
  };

  // Start all cameras
  const startAllCameras = () => {
    setIsGlobalRunning(true);
    activeFeeds.forEach(cameraId => {
      const camera = cameras?.find(c => c.id === cameraId);
      if (camera) {
        startAnalysis(cameraId, camera.name);
      }
    });
    toast.success('Análise iniciada em todas as câmeras');
  };

  // Stop all cameras
  const stopAllCameras = () => {
    setIsGlobalRunning(false);
    intervalsRef.current.forEach((_, cameraId) => {
      stopAnalysis(cameraId);
    });
    toast.info('Análise pausada');
  };

  // Handle video loaded
  const handleVideoLoaded = (cameraId: string, video: HTMLVideoElement) => {
    videoRefs.current.set(cameraId, video);
    
    if (isGlobalRunning) {
      const camera = cameras?.find(c => c.id === cameraId);
      if (camera) {
        startAnalysis(cameraId, camera.name);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intervalsRef.current.forEach((_, cameraId) => {
        stopAnalysis(cameraId);
      });
    };
  }, [stopAnalysis]);

  // Get active cameras data
  const activeCameras = cameras?.filter(c => activeFeeds.has(c.id)) || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b bg-card">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Multi-Câmeras ({activeFeeds.size}/{getMaxCameras()})
          </h2>

          {/* Layout Selector */}
          <Select value={layout} onValueChange={(v) => setLayout(v as LayoutType)}>
            <SelectTrigger className="w-32">
              <LayoutGrid className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1x1">1 Câmera</SelectItem>
              <SelectItem value="2x2">2x2 Grid</SelectItem>
              <SelectItem value="3x3">3x3 Grid</SelectItem>
              <SelectItem value="4x4">4x4 Grid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>

          {/* Settings Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Análise</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Intervalo de Captura: {captureInterval / 1000}s</Label>
                  <Slider
                    value={[captureInterval]}
                    onValueChange={([v]) => setCaptureInterval(v)}
                    min={1000}
                    max={10000}
                    step={500}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Limiar de Similaridade: {(matchThreshold * 100).toFixed(0)}%</Label>
                  <Slider
                    value={[matchThreshold * 100]}
                    onValueChange={([v]) => setMatchThreshold(v / 100)}
                    min={30}
                    max={95}
                    step={5}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Camera Selector */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Grid className="h-4 w-4 mr-2" />
                Selecionar Câmeras
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Selecionar Câmeras</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-80">
                <div className="space-y-2 p-1">
                  {cameras?.map((camera) => (
                    <div
                      key={camera.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors',
                        activeFeeds.has(camera.id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'hover:bg-muted'
                      )}
                      onClick={() => toggleCamera(camera.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          camera.status === 'online' ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        <div>
                          <p className="font-medium">{camera.name}</p>
                          <p className="text-xs text-muted-foreground">{camera.location}</p>
                        </div>
                      </div>
                      <Switch checked={activeFeeds.has(camera.id)} />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          {/* Start/Stop All */}
          {isGlobalRunning ? (
            <Button variant="destructive" size="sm" onClick={stopAllCameras}>
              <Pause className="h-4 w-4 mr-2" />
              Pausar Todas
            </Button>
          ) : (
            <Button size="sm" onClick={startAllCameras} disabled={activeFeeds.size === 0}>
              <Play className="h-4 w-4 mr-2" />
              Iniciar Todas
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Camera Grid */}
        <div className="flex-1 p-4 overflow-auto">
          {activeFeeds.size === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Camera className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhuma câmera selecionada</h3>
                <p className="text-muted-foreground">
                  Clique em "Selecionar Câmeras" para adicionar feeds
                </p>
              </div>
            </div>
          ) : (
            <div className={cn('grid gap-4 h-full', getLayoutClass())}>
              {activeCameras.map((camera) => (
                <CameraFeedCard
                  key={camera.id}
                  camera={camera}
                  isAnalyzing={intervalsRef.current.has(camera.id)}
                  onVideoLoaded={(video) => handleVideoLoaded(camera.id, video)}
                  onRemove={() => toggleCamera(camera.id)}
                  onFullscreen={() => setFullscreenCamera(camera.id)}
                  recentDetections={recognitionResults.filter(r => r.cameraId === camera.id).slice(0, 3)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Detection Sidebar */}
        <div className="w-80 border-l bg-card hidden lg:block">
          <div className="p-4 border-b">
            <h3 className="font-semibold">Detecções Recentes</h3>
            <p className="text-sm text-muted-foreground">
              {recognitionResults.length} detecções
            </p>
          </div>
          <ScrollArea className="h-[calc(100%-60px)]">
            <div className="p-2 space-y-2">
              {recognitionResults.slice(0, 20).map((result, idx) => (
                <div
                  key={`${result.cameraId}-${result.timestamp.getTime()}-${idx}`}
                  className={cn(
                    'p-3 rounded-lg border',
                    result.isBlacklist && 'border-destructive bg-destructive/5'
                  )}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      {result.personId && personsCache.current.get(result.personId)?.photoUrl ? (
                        <AvatarImage src={personsCache.current.get(result.personId)!.photoUrl!} />
                      ) : null}
                      <AvatarFallback className={result.isBlacklist ? 'bg-destructive text-destructive-foreground' : ''}>
                        {result.personName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{result.personName}</span>
                        {result.isBlacklist && (
                          <Badge variant="destructive" className="text-xs">Blacklist</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{result.cameraName}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{result.timestamp.toLocaleTimeString('pt-BR')}</span>
                        {result.confidence > 0 && (
                          <span>• {(result.confidence * 100).toFixed(0)}%</span>
                        )}
                      </div>
                    </div>
                    {result.isBlacklist ? (
                      <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                    ) : result.personId ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : null}
                  </div>
                </div>
              ))}

              {recognitionResults.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Nenhuma detecção ainda</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <Dialog open={!!fullscreenCamera} onOpenChange={() => setFullscreenCamera(null)}>
          <DialogContent className="max-w-6xl h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                {cameras?.find(c => c.id === fullscreenCamera)?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 bg-black rounded-lg overflow-hidden">
              {cameras?.find(c => c.id === fullscreenCamera)?.stream_url ? (
                <video
                  src={cameras.find(c => c.id === fullscreenCamera)?.stream_url || ''}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem stream disponível
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Camera Feed Card Component
interface CameraFeedCardProps {
  camera: any;
  isAnalyzing: boolean;
  onVideoLoaded: (video: HTMLVideoElement) => void;
  onRemove: () => void;
  onFullscreen: () => void;
  recentDetections: RecognitionResult[];
}

function CameraFeedCard({
  camera,
  isAnalyzing,
  onVideoLoaded,
  onRemove,
  onFullscreen,
  recentDetections,
}: CameraFeedCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      onVideoLoaded(videoRef.current);
    }
  }, [onVideoLoaded]);

  const latestDetection = recentDetections[0];

  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="p-3 flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            isAnalyzing ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
          )} />
          <CardTitle className="text-sm font-medium truncate">{camera.name}</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onFullscreen}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        <div className="aspect-video bg-black">
          {camera.stream_url ? (
            <video
              ref={videoRef}
              src={camera.stream_url}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
          ) : camera.thumbnail ? (
            <img src={camera.thumbnail} alt={camera.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Detection Overlay */}
        {latestDetection && (
          <div className={cn(
            'absolute bottom-0 left-0 right-0 p-2',
            latestDetection.isBlacklist 
              ? 'bg-destructive/90' 
              : 'bg-background/90'
          )}>
            <div className="flex items-center gap-2">
              {latestDetection.isBlacklist ? (
                <AlertTriangle className="h-4 w-4 text-destructive-foreground" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className={cn(
                'text-sm font-medium truncate',
                latestDetection.isBlacklist && 'text-destructive-foreground'
              )}>
                {latestDetection.personName}
              </span>
              {latestDetection.confidence > 0 && (
                <Badge variant="secondary" className="text-xs ml-auto">
                  {(latestDetection.confidence * 100).toFixed(0)}%
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Analyzing Indicator */}
        {isAnalyzing && (
          <div className="absolute top-2 right-2">
            <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground px-2 py-1 rounded-full text-xs">
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-pulse" />
              Analisando
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
