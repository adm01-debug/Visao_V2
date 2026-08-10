/**
 * Onda Shinobi 7 — Página de Saúde dos Streams RTSP
 * Lista câmeras com janela de saúde, eventos de restart e ação manual.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useStreamHealth } from '@/hooks/useStreamHealth';
import { Activity, RotateCcw, Loader2 } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';

export default function StreamHealthPage() {
  const { summaries, restarts, loading, reload, triggerManualRestart } = useStreamHealth();

  return (
    <PageContent>
      <PageMeta
        title="Saúde dos Streams — VISÃO"
        description="Monitoramento em janela deslizante dos streams RTSP e auto-restart de câmeras degradadas."
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Saúde dos Streams
          </h1>
          <p className="text-muted-foreground text-sm">
            Avaliação automática a cada 2 min · backoff exponencial · janela de 6 checks
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Atualizar'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Câmeras monitoradas</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum health check registrado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Câmera</TableHead>
                  <TableHead>Última verificação</TableHead>
                  <TableHead>Falhas / Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summaries.map((s) => (
                  <TableRow key={s.camera_id}>
                    <TableCell className="font-mono text-xs">{s.camera_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      {s.last_check_at ? new Date(s.last_check_at).toLocaleString('pt-BR') : '—'}
                    </TableCell>
                    <TableCell>
                      {s.fails} / {s.total}
                    </TableCell>
                    <TableCell>
                      {s.unhealthy ? (
                        <Badge variant="destructive">Degradado</Badge>
                      ) : (
                        <Badge variant="secondary">OK</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void triggerManualRestart(s.camera_id)}
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Restart
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos de restart recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {restarts.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Nenhum evento registrado.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quando</TableHead>
                  <TableHead>Câmera</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Tentativa</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {restarts.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.created_at).toLocaleString('pt-BR')}</TableCell>
                    <TableCell className="font-mono text-xs">{r.camera_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge variant={r.triggered_by === 'auto' ? 'default' : 'secondary'}>
                        {r.triggered_by}
                      </Badge>
                    </TableCell>
                    <TableCell>#{r.attempt}</TableCell>
                    <TableCell className="text-xs">{r.reason}</TableCell>
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
