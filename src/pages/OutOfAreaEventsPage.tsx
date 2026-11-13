/**
 * VISÃO — Ocorrências de Pessoas Fora das Áreas Permitidas
 *
 * Lista eventos gerados pelo pipeline `process-frame` quando pessoas são
 * detectadas fora de todas as zonas permitidas (type='safe') da câmera.
 */
import { useEffect, useMemo, useState } from 'react';
import { PageContent } from '@/components/layout/MainLayout';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OccurrenceRow {
  id: string;
  timestamp: string;
  detected_objects: unknown;
}

interface CameraOption {
  id: string;
  name: string;
}

interface OccurrenceWithCamera extends OccurrenceRow {
  cameraId: string | null;
  cameraName: string;
  count: number;
  topConfidence: number | null;
}

const parseOccurrence = (
  row: OccurrenceRow,
  cameras: Map<string, string>
): OccurrenceWithCamera => {
  const objs = Array.isArray(row.detected_objects) ? row.detected_objects : [];
  const first = (objs[0] ?? {}) as Record<string, unknown>;
  const cameraId = typeof first.camera_id === 'string' ? first.camera_id : null;
  const topConfidence = typeof first.confidence === 'number' ? first.confidence : null;
  return {
    ...row,
    cameraId,
    cameraName: cameraId ? (cameras.get(cameraId) ?? 'Câmera desconhecida') : '—',
    count: objs.length,
    topConfidence,
  };
};

export default function OutOfAreaEventsPage() {
  const [rows, setRows] = useState<OccurrenceRow[]>([]);
  const [cameras, setCameras] = useState<CameraOption[]>([]);
  const [cameraFilter, setCameraFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);

  const cameraMap = useMemo(() => new Map(cameras.map((c) => [c.id, c.name])), [cameras]);

  const fetchData = async () => {
    setLoading(true);
    const { data: camsData } = await supabase.from('cameras').select('id, name').order('name');
    setCameras((camsData ?? []).map((c) => ({ id: c.id, name: c.name })));

    const { data: eventsData } = await supabase
      .from('zone_events')
      .select('id, timestamp, detected_objects')
      .eq('event_type', 'person_out_of_allowed_area')
      .order('timestamp', { ascending: false })
      .limit(200);
    setRows((eventsData ?? []) as OccurrenceRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void fetchData();
    const channel = supabase
      .channel(`out-of-area-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'zone_events',
          filter: 'event_type=eq.person_out_of_allowed_area',
        },
        (payload) => setRows((prev) => [payload.new as OccurrenceRow, ...prev].slice(0, 200))
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const enriched = useMemo(() => rows.map((r) => parseOccurrence(r, cameraMap)), [rows, cameraMap]);
  const filtered = useMemo(
    () => (cameraFilter === 'all' ? enriched : enriched.filter((r) => r.cameraId === cameraFilter)),
    [enriched, cameraFilter]
  );

  const totals = useMemo(() => {
    const byCamera = new Map<string, number>();
    for (const r of enriched) {
      if (!r.cameraId) continue;
      byCamera.set(r.cameraId, (byCamera.get(r.cameraId) ?? 0) + r.count);
    }
    return {
      total: enriched.reduce((s, r) => s + r.count, 0),
      cameras: byCamera.size,
      last: enriched[0]?.timestamp ?? null,
    };
  }, [enriched]);

  return (
    <PageContent className="container mx-auto p-6">
      <Helmet>
        <title>Pessoas Fora da Área Permitida — VISÃO</title>
        <meta
          name="description"
          content="Ocorrências de pessoas detectadas fora das zonas permitidas por câmera."
        />
      </Helmet>

      <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            Pessoas Fora da Área Permitida
          </h1>
          <p className="text-sm text-muted-foreground">
            Ocorrências geradas quando pessoas aparecem fora das zonas do tipo{' '}
            <strong>Área Segura</strong> de cada câmera.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={cameraFilter} onValueChange={setCameraFilter}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todas as câmeras" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as câmeras</SelectItem>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void fetchData()}
            disabled={loading}
            aria-label="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Ocorrências (últimas 200)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Câmeras afetadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totals.cameras}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Última ocorrência</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg">
              {totals.last
                ? formatDistanceToNow(new Date(totals.last), { addSuffix: true, locale: ptBR })
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registro de ocorrências</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma ocorrência registrada.</p>
          ) : (
            <div className="divide-y">
              {filtered.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="destructive">Fora da área</Badge>
                    <div>
                      <div className="font-medium">{r.cameraName}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.timestamp).toLocaleString('pt-BR')} · {r.count} pessoa(s)
                        {r.topConfidence !== null &&
                          r.topConfidence !== undefined &&
                          ` · confiança ${(r.topConfidence * 100).toFixed(0)}%`}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(r.timestamp), { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  );
}
