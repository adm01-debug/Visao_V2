import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCameras, DbCamera } from '@/hooks/useCameras';
import { StreamConfigPanel } from '@/components/StreamConfigPanel';
import { VideoStreamPlayer } from '@/components/VideoStreamPlayer';
import { 
  ArrowLeft, 
  Video, 
  Camera, 
  Wifi, 
  WifiOff,
  Settings,
  Play,
  RefreshCw,
  Plus,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/i18n';

export default function StreamSettingsPage() {
  const { t } = useI18n();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { cameras, loading: camerasLoading, updateCamera } = useCameras();
  
  const [selectedCamera, setSelectedCamera] = useState<DbCamera | null>(null);
  const [testingStream, setTestingStream] = useState(false);
  const [streamStatus, setStreamStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  // Selecionar câmera via query param
  useEffect(() => {
    const cameraId = searchParams.get('camera');
    if (cameraId && cameras.length > 0) {
      const camera = cameras.find(c => c.id === cameraId);
      if (camera) setSelectedCamera(camera);
    }
  }, [searchParams, cameras]);

  const handleSaveConfig = async (config: any) => {
    if (!selectedCamera) return;

    try {
      await updateCamera(selectedCamera.id, {
        stream_url: config.url,
      });
      
      toast.success('Configuração de stream salva');
    } catch (error) {
      console.error('Error saving stream config:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleTestStream = async (url: string): Promise<boolean> => {
    setTestingStream(true);
    setStreamStatus('testing');

    try {
      // Teste básico - verificar se a URL é acessível
      // Para HLS, podemos tentar buscar o manifesto
      if (url.includes('.m3u8')) {
        const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        setStreamStatus('success');
        return true;
      }
      
      // Para RTSP, não podemos testar diretamente do browser
      // Apenas validamos o formato da URL
      if (url.startsWith('rtsp://')) {
        setStreamStatus('success');
        toast.info('URL RTSP válida. Teste completo requer servidor de mídia.');
        return true;
      }

      setStreamStatus('error');
      return false;
    } catch {
      setStreamStatus('error');
      return false;
    } finally {
      setTestingStream(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Configuração de Streams</h1>
                <p className="text-sm text-muted-foreground">RTSP, HLS e câmeras IP profissionais</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Câmeras */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Câmeras
                </CardTitle>
                <CardDescription>
                  Selecione uma câmera para configurar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {camerasLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : cameras.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                    <p className="text-muted-foreground">Nenhuma câmera cadastrada</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/cameras')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Câmera
                    </Button>
                  </div>
                ) : (
                  cameras.map(camera => {
                    const isSelected = selectedCamera?.id === camera.id;
                    const isOnline = camera.status === 'online' || camera.status === 'alert';
                    const hasStream = !!camera.stream_url;

                    return (
                      <button
                        key={camera.id}
                        onClick={() => setSelectedCamera(camera)}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-all',
                          'hover:border-primary/50 hover:bg-accent/50',
                          isSelected && 'border-primary bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isOnline ? (
                              <Wifi className="h-4 w-4 text-green-500" />
                            ) : (
                              <WifiOff className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div>
                              <p className="font-medium">{camera.name}</p>
                              <p className="text-xs text-muted-foreground">{camera.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasStream ? (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Stream
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Sem stream
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>

          {/* Configuração do Stream */}
          <div className="lg:col-span-2 space-y-6">
            {selectedCamera ? (
              <>
                {/* Preview do Stream */}
                {selectedCamera.stream_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" />
                        Preview do Stream
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VideoStreamPlayer
                        cameraId={selectedCamera.id}
                        cameraName={selectedCamera.name}
                        location={selectedCamera.location}
                        streamUrl={selectedCamera.stream_url}
                        showStats
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Painel de Configuração */}
                <StreamConfigPanel
                  cameraId={selectedCamera.id}
                  cameraName={selectedCamera.name}
                  initialStreamUrl={selectedCamera.stream_url || ''}
                  onSave={handleSaveConfig}
                  onTest={handleTestStream}
                />
              </>
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">
                    Selecione uma câmera para configurar o stream
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
