/**
 * Onda Shinobi 4 — Página de Agendamentos.
 */
import { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { PageMeta } from '@/components/PageMeta';
import { ScheduleForm } from '@/components/schedules/ScheduleForm';
import { useCameraSchedules, type CameraSchedule } from '@/hooks/useCameraSchedules';
import { useCameras } from '@/hooks/useCameras';
import { useMonitorGroups } from '@/hooks/useMonitorGroups';

function statusIcon(s: CameraSchedule['last_status']) {
  if (s === 'ok') return <CheckCircle2 className="w-3.5 h-3.5 text-success" />;
  if (s === 'error') return <XCircle className="w-3.5 h-3.5 text-destructive" />;
  if (s === 'skipped') return <MinusCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
}

export default function SchedulesPage() {
  const { schedules, loading, create, update, toggle, remove } = useCameraSchedules();
  const { cameras } = useCameras();
  const { groups } = useMonitorGroups();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CameraSchedule | null>(null);

  const cameraOptions = useMemo(
    () => cameras.map((c) => ({ id: c.id, name: c.name })),
    [cameras],
  );
  const groupOptions = useMemo(
    () => groups.map((g) => ({ id: g.id, name: g.name })),
    [groups],
  );

  const targetLabel = (s: CameraSchedule) => {
    if (s.scope === 'all') return 'Todas as câmeras';
    if (s.scope === 'camera') return cameraOptions.find((c) => c.id === s.camera_id)?.name ?? '(câmera removida)';
    return groupOptions.find((g) => g.id === s.group_id)?.name ?? '(grupo removido)';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <PageMeta title="Agendamentos · VISÃO" description="Programe horários para armar e desarmar câmeras automaticamente." />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Agendamentos</h1>
          <p className="text-sm text-muted-foreground">Automatize o Arm/Disarm por horário e dia da semana.</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Novo agendamento
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Programados ({schedules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhum agendamento ainda. Crie um para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground text-left">
                  <tr>
                    <th className="py-2 pr-2">Nome</th>
                    <th className="py-2 pr-2">Alvo</th>
                    <th className="py-2 pr-2">Ação</th>
                    <th className="py-2 pr-2">CRON</th>
                    <th className="py-2 pr-2">Última execução</th>
                    <th className="py-2 pr-2">Ativo</th>
                    <th className="py-2 pr-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s) => (
                    <tr key={s.id} className="border-t border-border">
                      <td className="py-2 pr-2 font-medium">{s.name}</td>
                      <td className="py-2 pr-2 text-muted-foreground">{targetLabel(s)}</td>
                      <td className="py-2 pr-2">
                        <Badge variant={s.action === 'arm' ? 'default' : 'secondary'}>
                          {s.action === 'arm' ? 'Armar' : 'Desarmar'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">{s.cron_expression}</td>
                      <td className="py-2 pr-2">
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {statusIcon(s.last_status)}
                          {s.last_run_at ? new Date(s.last_run_at).toLocaleString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="py-2 pr-2">
                        <Switch
                          checked={s.enabled}
                          onCheckedChange={(v) => toggle(s.id, v)}
                          aria-label={`${s.enabled ? 'Desativar' : 'Ativar'} ${s.name}`}
                        />
                      </td>
                      <td className="py-2 pr-2 text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditing(s); setOpen(true); }} aria-label={`Editar ${s.name}`}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(s.id)} aria-label={`Remover ${s.name}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <ScheduleForm
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        cameras={cameraOptions}
        groups={groupOptions}
        onSubmit={async (input) => {
          if (editing) await update(editing.id, input);
          else await create(input);
        }}
      />
    </div>
  );
}
