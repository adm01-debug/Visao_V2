import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCameras } from '@/hooks/useCameras';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, RotateCcw, Save, Trash2 } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';

const DEFAULTS = {
  consecutive_threshold: 2,
  cooldown_minutes: 30,
  critical_latency_ms: 400,
  critical_jitter_ms: 120,
  critical_loss_pct: 5,
};

type Threshold = typeof DEFAULTS & {
  id?: string;
  user_id?: string;
  camera_id: string | null;
};

const SCOPE_DEFAULT = '__default__';

export default function StreamAlertThresholdsPage() {
  const qc = useQueryClient();
  const { cameras } = useCameras();
  const [scope, setScope] = useState<string>(SCOPE_DEFAULT);
  const [form, setForm] = useState<Threshold>({ ...DEFAULTS, camera_id: null });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['stream_alert_thresholds'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stream_alert_thresholds').select('*');
      if (error) throw error;
      return (data ?? []) as Threshold[];
    },
  });

  const current = useMemo(() => {
    const cameraId = scope === SCOPE_DEFAULT ? null : scope;
    return rows.find((r) => r.camera_id === cameraId) ?? null;
  }, [rows, scope]);

  useEffect(() => {
    if (current) {
      setForm(current);
    } else {
      setForm({ ...DEFAULTS, camera_id: scope === SCOPE_DEFAULT ? null : scope });
    }
  }, [current, scope]);

  const saveMut = useMutation({
    mutationFn: async (payload: Threshold) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error('Não autenticado');
      const row = {
        user_id: uid,
        camera_id: payload.camera_id,
        consecutive_threshold: payload.consecutive_threshold,
        cooldown_minutes: payload.cooldown_minutes,
        critical_latency_ms: payload.critical_latency_ms,
        critical_jitter_ms: payload.critical_jitter_ms,
        critical_loss_pct: payload.critical_loss_pct,
      };
      const query =
        payload.camera_id === null
          ? supabase
              .from('stream_alert_thresholds')
              .upsert(row, { onConflict: 'user_id', ignoreDuplicates: false })
          : supabase
              .from('stream_alert_thresholds')
              .upsert(row, { onConflict: 'user_id,camera_id' });
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Parâmetros salvos');
      qc.invalidateQueries({ queryKey: ['stream_alert_thresholds'] });
    },
    onError: (e: Error) => toast.error(e.message || 'Falha ao salvar'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      if (!current?.id) return;
      const { error } = await supabase
        .from('stream_alert_thresholds')
        .delete()
        .eq('id', current.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configuração removida — usando padrão');
      qc.invalidateQueries({ queryKey: ['stream_alert_thresholds'] });
    },
  });

  const num = (v: string, min: number, max: number, fallback: number) => {
    const n = Number(v);
    if (Number.isNaN(n)) return fallback;
    return Math.max(min, Math.min(max, Math.round(n)));
  };

  return (
    <PageContent className="space-y-6">
      <PageMeta
        title="Parâmetros de Alerta de Stream"
        description="Ajuste threshold crítico, validações consecutivas e cooldown por usuário ou câmera"
      />

      <header className="space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-primary" aria-hidden="true" />
          Parâmetros de Alerta de Stream
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure quando o sistema deve considerar um stream em estado crítico e disparar
          notificações. A configuração por câmera sobrescreve a padrão do usuário.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Escopo</CardTitle>
          <CardDescription>Selecione o padrão do usuário ou uma câmera específica</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="scope">Aplicar a</Label>
          <Select value={scope} onValueChange={setScope}>
            <SelectTrigger id="scope" className="max-w-md">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SCOPE_DEFAULT}>Padrão do usuário (todas as câmeras)</SelectItem>
              {cameras.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} — {c.location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 pt-2">
            {current ? (
              <Badge variant="secondary">Configuração personalizada ativa</Badge>
            ) : (
              <Badge variant="outline">Usando valores padrão</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regras de disparo</CardTitle>
          <CardDescription>Quando alertar sobre um stream em estado crítico</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="threshold">Validações consecutivas críticas</Label>
            <Input
              id="threshold"
              type="number"
              min={1}
              max={20}
              value={form.consecutive_threshold}
              onChange={(e) =>
                setForm({
                  ...form,
                  consecutive_threshold: num(e.target.value, 1, 20, DEFAULTS.consecutive_threshold),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Dispara após N validações seguidas com score crítico (padrão: 2).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cooldown">Cooldown entre alertas (min)</Label>
            <Input
              id="cooldown"
              type="number"
              min={1}
              max={1440}
              value={form.cooldown_minutes}
              onChange={(e) =>
                setForm({
                  ...form,
                  cooldown_minutes: num(e.target.value, 1, 1440, DEFAULTS.cooldown_minutes),
                })
              }
            />
            <p className="text-xs text-muted-foreground">
              Tempo mínimo entre dois alertas do mesmo stream (padrão: 30 min).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limiares que classificam como crítico</CardTitle>
          <CardDescription>
            Um stream é crítico se qualquer métrica ultrapassar seu limite
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latency">Latência máxima (ms)</Label>
            <Input
              id="latency"
              type="number"
              min={50}
              max={10000}
              value={form.critical_latency_ms}
              onChange={(e) =>
                setForm({
                  ...form,
                  critical_latency_ms: num(e.target.value, 50, 10000, DEFAULTS.critical_latency_ms),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jitter">Jitter máximo (ms)</Label>
            <Input
              id="jitter"
              type="number"
              min={5}
              max={5000}
              value={form.critical_jitter_ms}
              onChange={(e) =>
                setForm({
                  ...form,
                  critical_jitter_ms: num(e.target.value, 5, 5000, DEFAULTS.critical_jitter_ms),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loss">Perda máxima (%)</Label>
            <Input
              id="loss"
              type="number"
              min={0}
              max={100}
              value={form.critical_loss_pct}
              onChange={(e) =>
                setForm({
                  ...form,
                  critical_loss_pct: num(e.target.value, 0, 100, DEFAULTS.critical_loss_pct),
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending || isLoading}>
          <Save className="h-4 w-4 mr-2" aria-hidden="true" />
          Salvar parâmetros
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            setForm({ ...DEFAULTS, camera_id: scope === SCOPE_DEFAULT ? null : scope })
          }
        >
          <RotateCcw className="h-4 w-4 mr-2" aria-hidden="true" />
          Restaurar padrão
        </Button>
        {current && (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
            Remover personalização
          </Button>
        )}
      </div>
    </PageContent>
  );
}
