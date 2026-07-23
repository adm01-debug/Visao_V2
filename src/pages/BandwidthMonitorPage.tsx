/**
 * Onda Shinobi 10 — Bandwidth Monitor Page
 * Dashboard de consumo de banda por câmera.
 */
import { useState } from 'react';
import { useBandwidthMonitor } from '@/hooks/useBandwidthMonitor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RefreshCw, Activity, Gauge, HardDrive } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function formatBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
}

export default function BandwidthMonitorPage() {
  const [days, setDays] = useState<number>(7);
  const { summary, recent, loading, refresh } = useBandwidthMonitor(days);

  const totalGb = summary.reduce((acc, r) => acc + Number(r.total_gb || 0), 0);
  const avgBitrate = summary.length
    ? summary.reduce((acc, r) => acc + Number(r.avg_bitrate_kbps || 0), 0) / summary.length
    : 0;
  const peakBitrate = summary.reduce((max, r) => Math.max(max, Number(r.peak_bitrate_kbps || 0)), 0);

  return (
    <PageContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consumo de Banda</h1>
          <p className="text-muted-foreground">
            Tráfego agregado por câmera nos últimos {days} dias.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">24 horas</SelectItem>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={refresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Consumido</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalGb.toFixed(2)} GB</div>
            <p className="text-xs text-muted-foreground">Somatório entre {summary.length} câmeras</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bitrate Médio</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgBitrate.toFixed(0)} kbps</div>
            <p className="text-xs text-muted-foreground">Média por câmera</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pico Global</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{peakBitrate.toFixed(0)} kbps</div>
            <p className="text-xs text-muted-foreground">Maior amostra registrada</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ranking por Câmera</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma amostra encontrada no período. Configure um agente para enviar métricas.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Câmera</TableHead>
                  <TableHead className="text-right">Consumo (GB)</TableHead>
                  <TableHead className="text-right">Bitrate Médio</TableHead>
                  <TableHead className="text-right">Pico</TableHead>
                  <TableHead className="text-right">Amostras</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.camera_id}>
                    <TableCell className="font-medium">{row.camera_name}</TableCell>
                    <TableCell className="text-right">{Number(row.total_gb).toFixed(3)}</TableCell>
                    <TableCell className="text-right">
                      {Number(row.avg_bitrate_kbps).toFixed(0)} kbps
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={row.peak_bitrate_kbps > 4000 ? 'destructive' : 'secondary'}>
                        {Number(row.peak_bitrate_kbps).toFixed(0)} kbps
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{row.sample_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Amostras Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem amostras recentes.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Stream</TableHead>
                  <TableHead>Resolução</TableHead>
                  <TableHead className="text-right">FPS</TableHead>
                  <TableHead className="text-right">Bytes</TableHead>
                  <TableHead className="text-right">Bitrate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.slice(0, 50).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(s.sampled_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.stream_type}</Badge>
                    </TableCell>
                    <TableCell>{s.resolution ?? '—'}</TableCell>
                    <TableCell className="text-right">{s.fps ?? '—'}</TableCell>
                    <TableCell className="text-right">{formatBytes(s.bytes_received)}</TableCell>
                    <TableCell className="text-right">
                      {Number(s.bitrate_kbps).toFixed(0)} kbps
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
