import { useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import {
  ScanFace,
  Camera,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  History,
  Grid,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LiveFaceRecognition } from '@/components/LiveFaceRecognition';
import { MultiCameraRecognition } from '@/components/MultiCameraRecognition';
import { RecognizedFace } from '@/hooks/useRealtimeRecognition';
import { useFaceAPI } from '@/hooks/useFaceAPI';
import { useFeatureReadyMark } from '@/hooks/useFeatureReadyMark';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageContent } from '@/components/layout/MainLayout';

interface RecognitionEvent {
  id: string;
  face: RecognizedFace;
  timestamp: Date;
  cameraName: string;
}

export default function FaceRecognitionPage() {
  useFeatureReadyMark('FaceRecognitionPage');
  const { isLoaded: _isLoaded, loadModels: _loadModels, detectFaces: _detectFaces } = useFaceAPI();
  const [activeTab, setActiveTab] = useState<'webcam' | 'multicam'>('multicam');
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionEvent[]>([]);
  const [stats, setStats] = useState({
    totalToday: 0,
    knownToday: 0,
    unknownToday: 0,
    alertsToday: 0,
  });

  const handleFaceRecognized = (face: RecognizedFace) => {
    const event: RecognitionEvent = {
      id: face.id,
      face,
      timestamp: new Date(),
      cameraName: 'Webcam',
    };
    setRecognitionHistory((prev) => [event, ...prev.slice(0, 49)]);
    setStats((prev) => ({
      ...prev,
      totalToday: prev.totalToday + 1,
      knownToday: prev.knownToday + 1,
    }));
  };

  const handleUnknownFace = (face: RecognizedFace) => {
    const event: RecognitionEvent = {
      id: face.id,
      face,
      timestamp: new Date(),
      cameraName: 'Webcam',
    };
    setRecognitionHistory((prev) => [event, ...prev.slice(0, 49)]);
    setStats((prev) => ({
      ...prev,
      totalToday: prev.totalToday + 1,
      unknownToday: prev.unknownToday + 1,
    }));
  };

  return (
    <>
      <PageMeta
        title="Reconhecimento Facial"
        description="Sistema de reconhecimento facial com IA"
      />

      <PageContent className="flex flex-col h-full">
        {/* Header */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-4 sm:px-6 py-4 border-b border-border/40 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
              <ScanFace className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Reconhecimento Facial</h1>
              <p className="text-sm text-muted-foreground">
                Identificação em tempo real via webcam ou câmeras IP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="flex items-center bg-muted/50 border border-border/40 rounded-lg p-1">
              <Button
                variant={activeTab === 'multicam' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('multicam')}
                className={cn(activeTab === 'multicam' && 'bg-primary text-primary-foreground')}
              >
                <Grid className="w-4 h-4 mr-2" />
                Multi-Câmeras
              </Button>
              <Button
                variant={activeTab === 'webcam' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('webcam')}
                className={cn(activeTab === 'webcam' && 'bg-primary text-primary-foreground')}
              >
                <MonitorPlay className="w-4 h-4 mr-2" />
                Webcam
              </Button>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = '/recognition-logs')}
              className="border-border/40"
            >
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </div>
        </header>

        {activeTab === 'multicam' ? (
          <MultiCameraRecognition />
        ) : (
          <div className="flex-1 p-4 sm:p-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Webcam feed */}
              <div className="lg:col-span-2">
                <Card className="h-full border-border/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-muted-foreground" />
                        <CardTitle className="text-lg text-foreground">Webcam</CardTitle>
                      </div>
                      <Badge variant="outline" className="gap-1.5 border-success/30 text-success">
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                        Ao vivo
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <LiveFaceRecognition
                      cameraId="webcam-main"
                      cameraName="Webcam Principal"
                      className="aspect-video rounded-b-lg"
                      showControls
                      showStats
                      onFaceRecognized={handleFaceRecognized}
                      onUnknownFace={handleUnknownFace}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar stats + history */}
              <div className="space-y-6">
                {/* Stats */}
                <Card className="border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">
                      Estatísticas do Dia
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/30">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {stats.totalToday}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-success/10 border border-success/20">
                        <UserCheck className="w-4 h-4 text-success" />
                        <div>
                          <p className="text-lg font-semibold text-success">{stats.knownToday}</p>
                          <p className="text-[10px] text-muted-foreground">Conhecidos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[hsl(var(--severity-medium))]/10 border border-[hsl(var(--severity-medium))]/20">
                        <UserX className="w-4 h-4 text-[hsl(var(--severity-medium))]" />
                        <div>
                          <p className="text-lg font-semibold text-foreground">
                            {stats.unknownToday}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Desconhecidos</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[hsl(var(--severity-critical))]/10 border border-[hsl(var(--severity-critical))]/20">
                        <AlertTriangle className="w-4 h-4 text-[hsl(var(--severity-critical))]" />
                        <div>
                          <p className="text-lg font-semibold text-[hsl(var(--severity-critical))]">
                            {stats.alertsToday}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Alertas</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recognition History */}
                <Card className="flex-1 border-border/40">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-foreground">
                      Últimos Reconhecimentos
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Histórico recente de faces detectadas
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ScrollArea className="h-[400px]">
                      {recognitionHistory.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                          <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border/40 flex items-center justify-center mb-3">
                            <ScanFace className="w-6 h-6 text-muted-foreground/50" />
                          </div>
                          <p className="text-sm font-medium">Nenhum reconhecimento ainda</p>
                          <p className="text-xs text-muted-foreground/70">
                            Inicie a câmera para começar
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-border/30">
                          {recognitionHistory.map((event) => (
                            <div
                              key={event.id}
                              className={cn(
                                'flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors',
                                !event.face.isKnown && 'bg-[hsl(var(--severity-medium))]/5'
                              )}
                            >
                              <Avatar className="w-10 h-10 border border-border/30">
                                {event.face.bestMatch?.photoUrl ? (
                                  <AvatarImage src={event.face.bestMatch.photoUrl} />
                                ) : null}
                                <AvatarFallback
                                  className={cn(
                                    'text-xs',
                                    event.face.isKnown
                                      ? 'bg-success/15 text-success border-success/20'
                                      : 'bg-muted/50'
                                  )}
                                >
                                  {event.face.isKnown ? (
                                    <UserCheck className="w-4 h-4" />
                                  ) : (
                                    <UserX className="w-4 h-4" />
                                  )}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate text-foreground">
                                  {event.face.isKnown
                                    ? event.face.bestMatch?.personName
                                    : 'Pessoa desconhecida'}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <span>{event.cameraName}</span>
                                  <span>•</span>
                                  <span>
                                    {formatDistanceToNow(event.timestamp, {
                                      addSuffix: true,
                                      locale: ptBR,
                                    })}
                                  </span>
                                </div>
                              </div>

                              {event.face.bestMatch?.similarity && (
                                <Badge
                                  variant={
                                    event.face.bestMatch.similarity > 0.8 ? 'default' : 'secondary'
                                  }
                                  className="text-xs"
                                >
                                  {Math.round(event.face.bestMatch.similarity * 100)}%
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </PageContent>
    </>
  );
}
