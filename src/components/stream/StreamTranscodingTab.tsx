/**
 * VISÃO - Stream Transcoding Tab
 */
import { Info, Server, Shield, Copy, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type TranscodingPreset = 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';

const TRANSCODING_PRESETS: { value: TranscodingPreset; label: string; description: string }[] = [
  { value: 'ultrafast', label: 'Ultra Rápido', description: 'Menor uso de CPU, menor qualidade' },
  { value: 'superfast', label: 'Super Rápido', description: 'Muito baixo uso de CPU' },
  { value: 'veryfast', label: 'Muito Rápido', description: 'Baixo uso de CPU, boa qualidade' },
  { value: 'faster', label: 'Rápido', description: 'Balanceado para streaming' },
  { value: 'fast', label: 'Normal', description: 'Boa qualidade, uso moderado de CPU' },
  { value: 'medium', label: 'Qualidade', description: 'Melhor qualidade, maior uso de CPU' },
];

interface StreamTranscodingTabProps {
  preset: TranscodingPreset;
  onPresetChange: (preset: TranscodingPreset) => void;
  ffmpegCommand: string;
  dockerCommand: string;
  onCopy: (text: string) => void;
}

export function StreamTranscodingTab({ preset, onPresetChange, ffmpegCommand, dockerCommand, onCopy }: StreamTranscodingTabProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Sobre Transcodificação</AlertTitle>
        <AlertDescription>Streams RTSP não são suportados diretamente pelos navegadores. É necessário um servidor de mídia para converter para HLS.</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5" />Preset de Transcodificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={preset} onValueChange={(v) => onPresetChange(v as TranscodingPreset)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSCODING_PRESETS.map(p => (
                <SelectItem key={p.value} value={p.value}>
                  <span className="font-medium">{p.label}</span>
                  <span className="text-muted-foreground ml-2 text-sm">- {p.description}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Comando FFmpeg</Label>
              <Button variant="ghost" size="sm" onClick={() => onCopy(ffmpegCommand)}><Copy className="h-4 w-4 mr-2" />Copiar</Button>
            </div>
            <Textarea value={ffmpegCommand} readOnly className="font-mono text-xs h-40" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />MediaMTX (Servidor de Mídia)</CardTitle>
          <CardDescription>Servidor de mídia recomendado para conversão RTSP → HLS</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Comando Docker</Label>
              <Button variant="ghost" size="sm" onClick={() => onCopy(dockerCommand)}><Copy className="h-4 w-4 mr-2" />Copiar</Button>
            </div>
            <Textarea value={dockerCommand} readOnly className="font-mono text-xs h-24" />
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary">Porta 8554: RTSP</Badge>
            <Badge variant="secondary">Porta 8888: HLS</Badge>
            <Badge variant="secondary">Porta 8889: WebRTC</Badge>
          </div>
          <Button variant="outline" className="w-full" asChild>
            <a href="https://github.com/bluenviron/mediamtx" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />Documentação MediaMTX
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
