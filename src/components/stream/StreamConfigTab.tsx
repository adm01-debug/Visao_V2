/**
 * VISÃO - Stream Config Tab
 */
import { Settings, Play, AlertCircle, CheckCircle2, RefreshCw, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { StreamProtocol } from '@/types/streaming';

const PROTOCOL_OPTIONS = [
  { value: 'rtsp', label: 'RTSP', description: 'Real Time Streaming Protocol - Câmeras IP' },
  { value: 'hls', label: 'HLS', description: 'HTTP Live Streaming - Compatível com browsers' },
  { value: 'mjpeg', label: 'MJPEG', description: 'Motion JPEG - Câmeras simples' },
];

interface StreamConfigTabProps {
  config: { protocol?: StreamProtocol; url?: string; username?: string; password?: string; transcodingEnabled?: boolean };
  setConfig: (updates: Record<string, unknown>) => void;
  testing: boolean;
  testResult: 'success' | 'error' | null;
  onTest: () => void;
  onSave: () => void;
  getExampleUrl: () => string;
}

export function StreamConfigTab({ config, setConfig, testing, testResult, onTest, onSave, getExampleUrl }: StreamConfigTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5" />Fonte do Stream</CardTitle>
          <CardDescription>Configure a conexão com sua câmera IP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Protocolo</Label>
            <Select value={config.protocol} onValueChange={(value) => setConfig({ protocol: value })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROTOCOL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="font-medium">{opt.label}</span>
                    <span className="text-muted-foreground ml-2 text-sm">- {opt.description}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>URL do Stream</Label>
            <div className="flex gap-2">
              <Input placeholder={getExampleUrl()} value={config.url} onChange={(e) => setConfig({ url: e.target.value })} className="font-mono text-sm" />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={onTest} disabled={testing}>
                      {testing ? <RefreshCw className="h-4 w-4 animate-spin" /> : testResult === 'success' ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : testResult === 'error' ? <AlertCircle className="h-4 w-4 text-red-500" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Testar conexão</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <p className="text-xs text-muted-foreground">Exemplo: {getExampleUrl()}</p>
          </div>

          {config.protocol === 'rtsp' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input placeholder="admin" value={config.username} onChange={(e) => setConfig({ username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" placeholder="••••••••" value={config.password} onChange={(e) => setConfig({ password: e.target.value })} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Transcodificação para HLS</p>
                <p className="text-sm text-muted-foreground">Converter RTSP para HLS compatível com browsers</p>
              </div>
            </div>
            <Switch checked={config.transcodingEnabled} onCheckedChange={(checked) => setConfig({ transcodingEnabled: checked })} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={onSave} className="w-full">Salvar Configuração</Button>
    </div>
  );
}
