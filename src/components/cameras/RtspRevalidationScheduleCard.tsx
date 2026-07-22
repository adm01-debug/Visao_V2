import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Clock, PlayCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

interface Props {
  cameraId: string;
}

interface Schedule {
  id: string;
  camera_id: string;
  user_id: string;
  enabled: boolean;
  interval_minutes: number;
  targets: string[];
  last_run_at: string | null;
  next_run_at: string;
  last_status: string | null;
  last_error: string | null;
}

const QUICK = [5, 15, 30, 60, 180];

export function RtspRevalidationScheduleCard({ cameraId }: Props) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [interval, setInterval] = useState(15);
  const [enabled, setEnabled] = useState(true);
  const [tPrimary, setTPrimary] = useState(true);
  const [tSubstream, setTSubstream] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ['rtsp-reval-sched', cameraId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rtsp_revalidation_schedules')
        .select('*')
        .eq('camera_id', cameraId)
        .maybeSingle();
      if (error) throw error;
      return data as Schedule | null;
    },
    refetchInterval: 20_000,
  });

  useEffect(() => {
    if (data) {
      setInterval(data.interval_minutes);
      setEnabled(data.enabled);
      setTPrimary(data.targets.includes('primary'));
      setTSubstream(data.targets.includes('substream'));
    }
  }, [data]);

  const save = async () => {
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) return;
    const targets = [
      ...(tPrimary ? ['primary'] : []),
      ...(tSubstream ? ['substream'] : []),
    ];
    if (targets.length === 0) {
      toast.error('Selecione ao menos um alvo (principal ou substream)');
      return;
    }
    if (interval < 1 || interval > 1440) {
      toast.error('Intervalo deve estar entre 1 e 1440 minutos');
      return;
    }
    setSaving(true);
    const payload = {
      camera_id: cameraId,
      user_id: userRes.user.id,
      enabled,
      interval_minutes: interval,
      targets,
      next_run_at: new Date().toISOString(),
    };
    const { error } = await supabase
      .from('rtsp_revalidation_schedules')
      .upsert(payload, { onConflict: 'camera_id' });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Agendamento salvo');
    qc.invalidateQueries({ queryKey: ['rtsp-reval-sched', cameraId] });
  };

  const runNow = async () => {
    if (!data) {
      toast.info('Salve o agendamento antes de disparar');
      return;
    }
    const { error } = await supabase
      .from('rtsp_revalidation_schedules')
      .update({ next_run_at: new Date().toISOString() })
      .eq('camera_id', cameraId);
    if (error) toast.error(error.message);
    else toast.success('Revalidação será executada em até 1 minuto');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4" />
            Revalidação automática do RTSP
          </CardTitle>
          {data?.last_status && (
            <Badge
              variant={
                data.last_status === 'ok' ? 'default'
                : data.last_status === 'critical' || data.last_status === 'error' ? 'destructive'
                : 'secondary'
              }
            >
              {data.last_status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Ativo</Label>
            <p className="text-xs text-muted-foreground">
              Revalida principal e/ou substream em intervalo fixo.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Intervalo (minutos)</Label>
          <div className="flex flex-wrap gap-2">
            {QUICK.map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={interval === m ? 'default' : 'outline'}
                onClick={() => setInterval(m)}
              >
                {m}m
              </Button>
            ))}
            <Input
              type="number"
              min={1}
              max={1440}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value) || 0)}
              className="w-24 h-8"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">Alvos</Label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={tPrimary} onCheckedChange={(v) => setTPrimary(Boolean(v))} />
              Principal
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={tSubstream} onCheckedChange={(v) => setTSubstream(Boolean(v))} />
              Substream
            </label>
          </div>
        </div>

        {(data?.last_run_at || data?.next_run_at) && (
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground border rounded-md p-2">
            <div>
              <span className="font-medium text-foreground block">Última</span>
              {data?.last_run_at
                ? formatDistanceToNow(new Date(data.last_run_at), { addSuffix: true, locale: ptBR })
                : '—'}
            </div>
            <div>
              <span className="font-medium text-foreground block">Próxima</span>
              {data?.next_run_at
                ? formatDistanceToNow(new Date(data.next_run_at), { addSuffix: true, locale: ptBR })
                : '—'}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button onClick={save} disabled={saving || isLoading} size="sm">
            {saving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : null}
            Salvar agendamento
          </Button>
          <Button onClick={runNow} variant="outline" size="sm">
            <PlayCircle className="w-3 h-3 mr-2" />
            Executar agora
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
