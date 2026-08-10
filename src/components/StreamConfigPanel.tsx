/**
 * VISÃO - Stream Config Panel (Refactored)
 */
import { memo, useState } from 'react';
import { Video } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { StreamProtocol } from '@/types/streaming';
import { StreamConfigTab } from './stream/StreamConfigTab';
import { StreamTranscodingTab } from './stream/StreamTranscodingTab';
import { StreamHelpTab } from './stream/StreamHelpTab';

interface StreamSource {
  protocol: StreamProtocol;
  url: string;
  username?: string;
  password?: string;
  enabled: boolean;
  transcodingEnabled: boolean;
  transcodingPreset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
}

interface StreamConfigPanelProps {
  cameraId?: string;
  cameraName?: string;
  initialStreamUrl?: string;
  onSave?: (config: Partial<StreamSource>) => void;
  onTest?: (url: string) => Promise<boolean>;
  className?: string;
}

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

  const updateConfig = (updates: Record<string, unknown>) =>
    setConfig((prev) => ({ ...prev, ...updates }));

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

  const getFFmpegCommand = () => {
    const inputUrl = config.url || 'rtsp://camera:554/stream';
    const outputPath = `/var/www/streams/${cameraId || 'camera1'}`;
    return `ffmpeg -rtsp_transport tcp -i "${inputUrl}" \\\n  -c:v libx264 -preset ${config.transcodingPreset || 'veryfast'} \\\n  -tune zerolatency -g 30 -sc_threshold 0 \\\n  -c:a aac -b:a 128k \\\n  -f hls -hls_time 2 -hls_list_size 3 \\\n  -hls_flags delete_segments+append_list \\\n  "${outputPath}/playlist.m3u8"`;
  };

  const getDockerCommand = () =>
    `docker run -d --name mediamtx \\\n  -p 8554:8554 -p 8888:8888 -p 8889:8889 \\\n  -e MTX_PROTOCOLS=tcp \\\n  bluenviron/mediamtx:latest`;

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
        await new Promise((resolve) => setTimeout(resolve, 2000));
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
    toast.success('Copiado para área de transferência');
  };

  return (
    <div className={cn('space-y-6', className)}>
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
        <TabsContent value="config">
          <StreamConfigTab
            config={config}
            setConfig={updateConfig}
            testing={testing}
            testResult={testResult}
            onTest={handleTest}
            onSave={handleSave}
            getExampleUrl={getExampleUrl}
          />
        </TabsContent>
        <TabsContent value="transcoding">
          <StreamTranscodingTab
            preset={config.transcodingPreset || 'veryfast'}
            onPresetChange={(p) => updateConfig({ transcodingPreset: p })}
            ffmpegCommand={getFFmpegCommand()}
            dockerCommand={getDockerCommand()}
            onCopy={copyToClipboard}
          />
        </TabsContent>
        <TabsContent value="help">
          <StreamHelpTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default memo(StreamConfigPanel);
