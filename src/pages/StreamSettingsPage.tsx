import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
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
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMediaMTX } from '@/hooks/useMediaMTX';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';

export default function StreamSettingsPage() {
  const { refresh: _refreshPaths } = useMediaMTX();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { cameras, loading: camerasLoading, updateCamera } = useCameras();
  const [selectedCamera, setSelectedCamera] = useState<DbCamera | null>(null);
  const [_testingStream, setTestingStream] = useState(false);
  const [_streamStatus, setStreamStatus] = useState<'idle' | 'testing' | 'success' | 'error'>(
    'idle'
  );

  useEffect(() => {
    const cameraId = searchParams.get('camera');
    if (cameraId && cameras.length > 0) {
      const camera = cameras.find((c) => c.id === cameraId);
      if (camera) setSelectedCamera(camera);
    }
  }, [searchParams, cameras]);

  const handleSaveConfig = async (configData: Record<string, unknown>) => {
    if (!selectedCamera) return;
    try {
      await updateCamera(selectedCamera.id, { stream_url: configData.url as string });
      toast.success('Configuração de stream salva');
    } catch {
      toast.error('Erro ao salvar configuração');
    }
  };

  const handleTestStream = async (url: string): Promise<boolean> => {
    setTestingStream(true);
    setStreamStatus('testing');
    try {
      if (url.includes('.m3u8')) {
        await fetch(url, { method: 'HEAD', mode: 'no-cors' });
        setStreamStatus('success');
        return true;
      }
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
    <PageContent className="-m-4 md:-m-6 space-y-0">
      <PageMeta
        title="Configuração de Streams"
        description="Configure streams RTSP, HLS e câmeras IP profissionais"
      />

      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" aria-hidden="true" />
              <div>
                <h1 className="text-xl font-bold">Configuração de Streams</h1>
                <p className="text-sm text-muted-foreground">
                  RTSP, HLS e câmeras IP profissionais
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6" aria-label="Configuração de streams">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Lista de Câmeras */}
          <nav aria-label="Lista de câmeras" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" aria-hidden="true" />
                  Câmeras
                </CardTitle>
                <CardDescription>Selecione uma câmera para configurar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {camerasLoading ? (
                  <div
                    className="flex items-center justify-center py-8"
                    aria-busy="true"
                    aria-label="Carregando câmeras"
                  >
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : cameras.length === 0 ? (
                  <div className="text-center py-8">
                    <Camera
                      className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30"
                      aria-hidden="true"
                    />
                    <p className="text-muted-foreground">Nenhuma câmera cadastrada</p>
                    <Button variant="outline" className="mt-4" onClick={() => navigate('/cameras')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Câmera
                    </Button>
                  </div>
                ) : (
                  cameras.map((camera) => {
                    const isSelected = selectedCamera?.id === camera.id;
                    const isOnline = camera.status === 'online' || camera.status === 'alert';
                    const hasStream = !!camera.stream_url;

                    return (
                      <button
                        key={camera.id}
                        onClick={() => setSelectedCamera(camera)}
                        aria-pressed={isSelected}
                        aria-label={`${camera.name} - ${camera.location}${hasStream ? ' (com stream)' : ' (sem stream)'}`}
                        className={cn(
                          'w-full p-3 rounded-lg border text-left transition-all',
                          'hover:border-primary/50 hover:bg-accent/50',
                          isSelected && 'border-primary bg-primary/5'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isOnline ? (
                              <Wifi className="h-4 w-4 text-success" aria-label="Online" />
                            ) : (
                              <WifiOff
                                className="h-4 w-4 text-muted-foreground"
                                aria-label="Offline"
                              />
                            )}
                            <div>
                              <p className="font-medium">{camera.name}</p>
                              <p className="text-xs text-muted-foreground">{camera.location}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasStream ? (
                              <Badge variant="secondary" className="gap-1">
                                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                                Stream
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1">
                                <AlertCircle className="h-3 w-3" aria-hidden="true" />
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
          </nav>

          {/* Configuração do Stream */}
          <section aria-label="Painel de configuração" className="lg:col-span-2 space-y-6">
            {selectedCamera ? (
              <>
                {selectedCamera.stream_url && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Play className="h-5 w-5" aria-hidden="true" />
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
                  <Settings
                    className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30"
                    aria-hidden="true"
                  />
                  <p className="text-muted-foreground">
                    Selecione uma câmera para configurar o stream
                  </p>
                </div>
              </Card>
            )}
          </section>
        </div>
      </main>
    </PageContent>
  );
}
