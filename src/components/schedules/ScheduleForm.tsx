/**
 * Onda Shinobi 4 — Editor de agendamento (dialog).
 */
import { memo, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  buildDailyCron,
  type CameraSchedule,
  type ScheduleAction,
  type ScheduleInput,
  type ScheduleScope,
} from '@/hooks/useCameraSchedules';

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

interface ScheduleFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CameraSchedule | null;
  cameras: { id: string; name: string }[];
  groups: { id: string; name: string }[];
  onSubmit: (input: ScheduleInput) => Promise<unknown>;
}

function ScheduleFormImpl({
  open,
  onOpenChange,
  initial,
  cameras,
  groups,
  onSubmit,
}: ScheduleFormProps) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ScheduleScope>('all');
  const [cameraId, setCameraId] = useState<string>('');
  const [groupId, setGroupId] = useState<string>('');
  const [action, setAction] = useState<ScheduleAction>('arm');
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(0);
  const [dow, setDow] = useState(0b0111110); // seg–sex
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setName(initial.name);
      setScope(initial.scope);
      setCameraId(initial.camera_id ?? '');
      setGroupId(initial.group_id ?? '');
      setAction(initial.action);
      const [m, h] = initial.cron_expression.trim().split(/\s+/);
      setHour(parseInt(h ?? '8', 10) || 8);
      setMinute(parseInt(m ?? '0', 10) || 0);
      setEnabled(initial.enabled);
      // dow bitmask reconstruction (best-effort)
      const dowStr = initial.cron_expression.trim().split(/\s+/)[4] ?? '*';
      if (dowStr === '*') setDow(0b1111111);
      else {
        let bm = 0;
        for (const p of dowStr.split(',')) {
          const n = parseInt(p, 10);
          if (!Number.isNaN(n) && n >= 0 && n <= 6) bm |= 1 << n;
        }
        setDow(bm || 0b1111111);
      }
    } else {
      setName('');
      setScope('all');
      setCameraId('');
      setGroupId('');
      setAction('arm');
      setHour(8);
      setMinute(0);
      setDow(0b0111110);
      setEnabled(true);
    }
  }, [open, initial]);

  const cron = useMemo(() => buildDailyCron(hour, minute, dow), [hour, minute, dow]);
  // Sem dia marcado o cron vira `*`, o mesmo valor de "todos os dias": o campo
  // nao distingue as duas intencoes, e o agendamento passaria a rodar todo dia.
  // Por isso o formulario exige ao menos um dia.
  const canSubmit =
    !!name.trim() &&
    dow !== 0 &&
    (scope === 'all' || (scope === 'camera' && cameraId) || (scope === 'group' && groupId));

  const submit = async () => {
    await onSubmit({
      name: name.trim(),
      scope,
      camera_id: scope === 'camera' ? cameraId : null,
      group_id: scope === 'group' ? groupId : null,
      action,
      cron_expression: cron,
      enabled,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? 'Editar agendamento' : 'Novo agendamento'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="sch-name" className="text-xs">
              Nome
            </Label>
            <Input
              id="sch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Armar à noite"
              maxLength={100}
            />
          </div>

          <div>
            <Label className="text-xs">Escopo</Label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as ScheduleScope)}
              className="grid grid-cols-3 gap-2 mt-1"
            >
              {(['camera', 'group', 'all'] as ScheduleScope[]).map((s) => (
                <label
                  key={s}
                  className="flex items-center gap-2 rounded border p-2 text-sm cursor-pointer hover:bg-muted"
                >
                  <RadioGroupItem value={s} />
                  <span>{s === 'camera' ? 'Câmera' : s === 'group' ? 'Grupo' : 'Todas'}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {scope === 'camera' && (
            <div>
              <Label className="text-xs">Câmera</Label>
              <Select value={cameraId} onValueChange={setCameraId}>
                <SelectTrigger aria-label="Câmera alvo">
                  <SelectValue placeholder="Escolha uma câmera" />
                </SelectTrigger>
                <SelectContent>
                  {cameras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {scope === 'group' && (
            <div>
              <Label className="text-xs">Grupo</Label>
              <Select value={groupId} onValueChange={setGroupId}>
                <SelectTrigger aria-label="Grupo alvo">
                  <SelectValue placeholder="Escolha um grupo" />
                </SelectTrigger>
                <SelectContent>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs">Ação</Label>
            <RadioGroup
              value={action}
              onValueChange={(v) => setAction(v as ScheduleAction)}
              className="grid grid-cols-2 gap-2 mt-1"
            >
              <label className="flex items-center gap-2 rounded border p-2 text-sm cursor-pointer hover:bg-muted">
                <RadioGroupItem value="arm" />
                <span>Armar</span>
              </label>
              <label className="flex items-center gap-2 rounded border p-2 text-sm cursor-pointer hover:bg-muted">
                <RadioGroupItem value="disarm" />
                <span>Desarmar</span>
              </label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sch-hour" className="text-xs">
                Hora
              </Label>
              <Input
                id="sch-hour"
                type="number"
                min={0}
                max={23}
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value || '0', 10))}
              />
            </div>
            <div>
              <Label htmlFor="sch-min" className="text-xs">
                Minuto
              </Label>
              <Input
                id="sch-min"
                type="number"
                min={0}
                max={59}
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value || '0', 10))}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Dias da semana</Label>
            <div className="flex gap-1 mt-1">
              {DAYS.map((label, i) => {
                const active = !!(dow & (1 << i));
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setDow((d) => d ^ (1 << i))}
                    className={cn(
                      'flex-1 py-1.5 text-xs rounded border',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground'
                    )}
                    aria-pressed={active}
                    aria-label={`${active ? 'Desativar' : 'Ativar'} ${label}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p
              className={cn(
                'mt-1 text-[10px] font-mono',
                dow === 0 ? 'text-destructive' : 'text-muted-foreground'
              )}
              aria-live="polite"
            >
              {dow === 0
                ? 'Selecione ao menos um dia — sem dia marcado não há quando executar.'
                : `CRON: ${cron} (America/Sao_Paulo)`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Switch id="sch-enabled" checked={enabled} onCheckedChange={setEnabled} />
            <Label htmlFor="sch-enabled" className="text-xs cursor-pointer">
              Ativo
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const ScheduleForm = memo(ScheduleFormImpl);
