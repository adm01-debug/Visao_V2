/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: StreamConfigPanel
 * 
 * Painel de configuração de streams RTSP/HLS para câmeras IP profissionais
 */

import { useState, useEffect } from 'react';
import { 
  Video, 
  Settings, 
  Play, 
  AlertCircle, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  Info,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Shield,
  Zap,
  HelpCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StreamProtocol } from '@/types/streaming';

// ============================================
// TIPOS
// ============================================

interface StreamSource {
  id: string;
  name: string;
  protocol: StreamProtocol;
  url: string;
  username?: string;
  password?: string;
  enabled: boolean;
  transcodingEnabled: boolean;
  transcodingPreset: TranscodingPreset;
  hlsOutputUrl?: string;
  status: 'offline' | 'connecting' | 'online' | 'error';
  lastError?: string;
}

type TranscodingPreset = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';

interface StreamConfigPanelProps {
  cameraId?: string;
  cameraName?: string;
  initialStreamUrl?: string;
  onSave?: (config: Partial<StreamSource>) => void;
  onTest?: (url: string) => Promise<boolean>;
  className?: string;
}

// ============================================
// PRESETS DE TRANSCODIFICAÇÃO
// ============================================

const TRANSCODING_PRESETS: { value: TranscodingPreset; label: string; description: string }[] = [
  { value: 'ultrafast', label: 'Ultra Rápido', description: 'Menor uso de CPU, menor qualidade' },
  { value: 'superfast', label: 'Super Rápido', description: 'Muito baixo uso de CPU' },
  { value: 'veryfast', label: 'Muito Rápido', description: 'Baixo uso de CPU, boa qualidade' },
  { value: 'faster', label: 'Rápido', description: 'Balanceado para streaming' },
  { value: 'fast', label: 'Normal', description: 'Boa qualidade, uso moderado de CPU' },
  { value: 'medium', label: 'Qualidade', description: 'Melhor qualidade, maior uso de CPU' },
];

const PROTOCOL_OPTIONS = [
  { value: 'rtsp', label: 'RTSP', description: 'Real Time Streaming Protocol - Câmeras IP' },
  { value: 'hls', label: 'HLS', description: 'HTTP Live Streaming - Compatível com browsers' },
  { value: 'mjpeg', label: 'MJPEG', description: 'Motion JPEG - Câmeras simples' },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function StreamConfigPanel({
  cameraId,
  cameraName,
  initialStreamUrl,
  onSave,
  onTest,
  className,
}: StreamConfigPanelProps) {
  const [config, setConfig] = useState<Partial<StreamSource>>({
    protocol: 'rtsp',
    url: initialStreamUrl || '',
    username: '',
    password: '',
    enabled: true,
    transcodingEnabled: true,
    transcodingPreset: 'veryfast',
  });
  
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  // Gerar URL de exemplo baseado no protocolo
  const getExampleUrl = () => {
    switch (config.protocol) {
      case 'rtsp':
        return 'rtsp://usuario:senha@192.168.1.100:554/stream1';
      case 'hls':
        return 'https://servidor.com/camera1/playlist.m3u8';
      case 'mjpeg':
        return 'http://192.168.1.100/mjpg/video.mjpg';
      default:
        return '';
    }
  };

  // Gerar comando FFmpeg para transcodificação
  const getFFmpegCommand = () => {
    const inputUrl = config.url || 'rtsp://camera:554/stream';
    const outputPath = `/var/www/streams/${cameraId || 'camera1'}`;
    
    return `ffmpeg -rtsp_transport tcp -i "${inputUrl}" \\
  -c:v libx264 -preset ${config.transcodingPreset || 'veryfast'} \\
  -tune zerolatency -g 30 -sc_threshold 0 \\
  -c:a aac -b:a 128k \\
  -f hls -hls_time 2 -hls_list_size 3 \\
  -hls_flags delete_segments+append_list \\
  "${outputPath}/playlist.m3u8"`;
  };

  // Gerar comando Docker para Media Server
  const getDockerCommand = () => {
    return `docker run -d --name mediamtx \\
  -p 8554:8554 -p 8888:8888 -p 8889:8889 \\
  -e MTX_PROTOCOLS=tcp \\
  bluenviron/mediamtx:latest`;
  };

  const handleTest = async () => {
    if (!config.url) {
      toast.error('Digite uma URL de stream');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      if (onTest) {
        const success = await onTest(config.url);
        setTestResult(success ? 'success' : 'error');
      } else {
        // Simulação de teste
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTestResult(config.url.includes('http') ? 'success' : 'error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!config.url) {
      toast.error('URL do stream é obrigatória');
      return;
    }
    onSave?.(config);
    toast.success('Configuração salva');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copiado para área de transferência');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center gap-3">
        <Video className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Configuração de Stream</h2>
          {cameraName && <p className="text-sm text-muted-foreground">{cameraName}</p>}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="transcoding">Transcodificação</TabsTrigger>
          <TabsTrigger value="help">Ajuda</TabsTrigger>
        </TabsList>

        {/* Tab: Configuração */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Fonte do Stream
              </CardTitle>
              <CardDescription>
                Configure a conexão com sua câmera IP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Protocolo */}
              <div className="space-y-2">
                <Label>Protocolo</Label>
                <Select
                  value={config.protocol}
                  onValueChange={(value) => setConfig({ ...config, protocol: value as StreamProtocol })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROTOCOL_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div>
                          <span className="font-medium">{opt.label}</span>
                          <span className="text-muted-foreground ml-2 text-sm">- {opt.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* URL do Stream */}
              <div className="space-y-2">
                <Label>URL do Stream</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder={getExampleUrl()}
                    value={config.url}
                    onChange={(e) => setConfig({ ...config, url: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="icon" onClick={handleTest} disabled={testing}>
                          {testing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : testResult === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : testResult === 'error' ? (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Testar conexão</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p className="text-xs text-muted-foreground">
                  Exemplo: {getExampleUrl()}
                </p>
              </div>

              {/* Credenciais (para RTSP) */}
              {config.protocol === 'rtsp' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Usuário</Label>
                    <Input
                      placeholder="admin"
                      value={config.username}
                      onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      value={config.password}
                      onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Habilitar transcodificação */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Transcodificação para HLS</p>
                    <p className="text-sm text-muted-foreground">
                      Converter RTSP para HLS compatível com browsers
                    </p>
                  </div>
                </div>
                <Switch
                  checked={config.transcodingEnabled}
                  onCheckedChange={(checked) => setConfig({ ...config, transcodingEnabled: checked })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button onClick={handleSave} className="flex-1">
              Salvar Configuração
            </Button>
          </div>
        </TabsContent>

        {/* Tab: Transcodificação */}
        <TabsContent value="transcoding" className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Sobre Transcodificação</AlertTitle>
            <AlertDescription>
              Streams RTSP não são suportados diretamente pelos navegadores. 
              É necessário um servidor de mídia para converter para HLS.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Preset de Transcodificação
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                value={config.transcodingPreset}
                onValueChange={(value) => setConfig({ ...config, transcodingPreset: value as TranscodingPreset })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSCODING_PRESETS.map(preset => (
                    <SelectItem key={preset.value} value={preset.value}>
                      <div>
                        <span className="font-medium">{preset.label}</span>
                        <span className="text-muted-foreground ml-2 text-sm">- {preset.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Separator />

              {/* Comando FFmpeg */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Comando FFmpeg</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(getFFmpegCommand())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <Textarea 
                  value={getFFmpegCommand()} 
                  readOnly 
                  className="font-mono text-xs h-40"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                MediaMTX (Servidor de Mídia)
              </CardTitle>
              <CardDescription>
                Servidor de mídia recomendado para conversão RTSP → HLS
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Comando Docker</Label>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(getDockerCommand())}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <Textarea 
                  value={getDockerCommand()} 
                  readOnly 
                  className="font-mono text-xs h-24"
                />
              </div>

              <div className="flex gap-2">
                <Badge variant="secondary">Porta 8554: RTSP</Badge>
                <Badge variant="secondary">Porta 8888: HLS</Badge>
                <Badge variant="secondary">Porta 8889: WebRTC</Badge>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Documentação MediaMTX
                </a>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Ajuda */}
        <TabsContent value="help" className="space-y-6">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="rtsp">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4" />
                  Como encontrar a URL RTSP da minha câmera?
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A URL RTSP geralmente segue o padrão:
                </p>
                <code className="block p-2 bg-muted rounded text-xs">
                  rtsp://usuario:senha@IP:porta/caminho
                </code>
                <div className="space-y-2 text-sm">
                  <p><strong>Hikvision:</strong> rtsp://admin:senha@IP:554/Streaming/Channels/101</p>
                  <p><strong>Dahua:</strong> rtsp://admin:senha@IP:554/cam/realmonitor?channel=1</p>
                  <p><strong>Intelbras:</strong> rtsp://admin:senha@IP:554/cam/realmonitor?channel=1</p>
                  <p><strong>Axis:</strong> rtsp://IP/axis-media/media.amp</p>
                  <p><strong>Tapo:</strong> rtsp://usuario:senha@IP:554/stream1</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="hls">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  Por que usar HLS ao invés de RTSP?
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>
                  Navegadores web não suportam RTSP nativamente por questões de segurança.
                  HLS (HTTP Live Streaming) é o padrão mais compatível:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Funciona em todos os navegadores modernos</li>
                  <li>Suporta qualidade adaptativa</li>
                  <li>Mais resiliente a problemas de rede</li>
                  <li>Compatível com CDNs</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="server">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Qual servidor de mídia devo usar?
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Recomendamos o <strong>MediaMTX</strong> (antigo rtsp-simple-server):</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Gratuito e open-source</li>
                  <li>Suporta RTSP, HLS, WebRTC, SRT</li>
                  <li>Baixo consumo de recursos</li>
                  <li>Fácil configuração via Docker</li>
                  <li>Transcodificação automática</li>
                </ul>
                <p className="mt-2">
                  Alternativas: nginx-rtmp, Wowza, Ant Media Server
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="latency">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Como reduzir a latência do stream?
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <p>Para reduzir a latência:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use preset "ultrafast" ou "superfast"</li>
                  <li>Reduza o tamanho dos segmentos HLS (2s ou menos)</li>
                  <li>Use Low-Latency HLS (LL-HLS)</li>
                  <li>Considere WebRTC para latência sub-segundo</li>
                  <li>Use conexão com fio ao invés de WiFi</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="troubleshoot">
              <AccordionTrigger>
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4" />
                  Resolução de Problemas
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 text-sm text-muted-foreground">
                <div className="space-y-4">
                  <div>
                    <p className="font-medium text-foreground">Stream não conecta:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Verifique se a câmera está ligada e acessível na rede</li>
                      <li>Teste a URL RTSP em VLC Player primeiro</li>
                      <li>Confirme usuário e senha</li>
                      <li>Verifique se a porta está aberta no firewall</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Stream trava ou fica lento:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Reduza a resolução/FPS na câmera</li>
                      <li>Use preset mais rápido de transcodificação</li>
                      <li>Verifique largura de banda da rede</li>
                      <li>Use TCP ao invés de UDP para RTSP</li>
                    </ul>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default StreamConfigPanel;
