import { EmptyState, ErrorState, LoadingSpinner, StatusBadge, SeverityBadge, TimeAgo, ConfirmDialog } from "@/components";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Reconhecimento Facial
 * 
 * Página dedicada para reconhecimento facial em tempo real
 * com visualização de câmeras e identificação de pessoas
 */

import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  ScanFace,
  Camera,
  Users,
  UserCheck,
  UserX,
  AlertTriangle,
  Settings,
  History,
  Grid,
  MonitorPlay,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { LiveFaceRecognition } from '@/components/LiveFaceRecognition';
import { MultiCameraRecognition } from '@/components/MultiCameraRecognition';
import { RecognizedFace } from '@/hooks/useRealtimeRecognition';
import { useI18n } from '@/contexts/i18n';
import { useFaceAPI } from '@/hooks/useFaceAPI';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Histórico de reconhecimentos
interface RecognitionEvent {
  id: string;
  face: RecognizedFace;
  timestamp: Date;
  cameraName: string;
}

export default function FaceRecognitionPage() {
  const { isLoaded, loadModels, detectFaces } = useFaceAPI();

  const { t } = useI18n();
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

    setRecognitionHistory(prev => [event, ...prev.slice(0, 49)]);
    setStats(prev => ({
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

    setRecognitionHistory(prev => [event, ...prev.slice(0, 49)]);
    setStats(prev => ({
      ...prev,
      totalToday: prev.totalToday + 1,
      unknownToday: prev.unknownToday + 1,
    }));
  };

  return (
    <>
      <Helmet>
        <title>Reconhecimento Facial | VISÃO</title>
        <meta name="description" content="Sistema de reconhecimento facial em tempo real para vigilância inteligente" />
      </Helmet>

      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <ScanFace className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Reconhecimento Facial</h1>
              <p className="text-sm text-muted-foreground">
                Identificação em tempo real via webcam ou câmeras IP
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab Switcher */}
            <div className="flex items-center bg-muted rounded-lg p-1">
              <Button
                variant={activeTab === 'multicam' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('multicam')}
              >
                <Grid className="w-4 h-4 mr-2" />
                Multi-Câmeras
              </Button>
              <Button
                variant={activeTab === 'webcam' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('webcam')}
              >
                <MonitorPlay className="w-4 h-4 mr-2" />
                Webcam
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => window.location.href = '/recognition-logs'}>
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
          </div>
        </header>

        {/* Content */}
        {activeTab === 'multicam' ? (
          <MultiCameraRecognition />
        ) : (
          <div className="flex-1 p-6 overflow-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              {/* Câmera Principal */}
              <div className="lg:col-span-2">
                <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-lg">Webcam</CardTitle>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
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

            {/* Painel Lateral */}
            <div className="space-y-6">
              {/* Estatísticas do Dia */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Estatísticas do Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold">{stats.totalToday}</p>
                        <p className="text-[10px] text-muted-foreground">Total</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                      <UserCheck className="w-4 h-4 text-green-600" />
                      <div>
                        <p className="text-lg font-semibold text-green-600">{stats.knownToday}</p>
                        <p className="text-[10px] text-muted-foreground">Conhecidos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <UserX className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-lg font-semibold">{stats.unknownToday}</p>
                        <p className="text-[10px] text-muted-foreground">Desconhecidos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10">
                      <AlertTriangle className="w-4 h-4 text-destructive" />
                      <div>
                        <p className="text-lg font-semibold text-destructive">{stats.alertsToday}</p>
                        <p className="text-[10px] text-muted-foreground">Alertas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Últimos Reconhecimentos */}
              <Card className="flex-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Últimos Reconhecimentos</CardTitle>
                  <CardDescription className="text-xs">
                    Histórico recente de faces detectadas
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[400px]">
                    {recognitionHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <ScanFace className="w-10 h-10 mb-2 opacity-50" />
                        <p className="text-sm">Nenhum reconhecimento ainda</p>
                        <p className="text-xs">Inicie a câmera para começar</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {recognitionHistory.map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              'flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors',
                              !event.face.isKnown && 'bg-muted/30'
                            )}
                          >
                            <Avatar className="w-10 h-10">
                              {event.face.bestMatch?.photoUrl ? (
                                <AvatarImage src={event.face.bestMatch.photoUrl} />
                              ) : null}
                              <AvatarFallback className={cn(
                                event.face.isKnown ? 'bg-green-500/20 text-green-700' : 'bg-muted'
                              )}>
                                {event.face.isKnown ? (
                                  <UserCheck className="w-4 h-4" />
                                ) : (
                                  <UserX className="w-4 h-4" />
                                )}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
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
                                variant={event.face.bestMatch.similarity > 0.8 ? 'default' : 'secondary'}
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
      </div>
    </>
  );
}

