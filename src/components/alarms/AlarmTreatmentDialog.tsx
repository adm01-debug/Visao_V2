import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Check, History, ShieldAlert, Undo2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useAlarmTreatments, useTreatAlarm } from '@/hooks/useAlarmTreatment';
import {
  allowedActions,
  allowedCodes,
  alarmActionLabel,
  alarmStatusLabel,
  evaluateTreatment,
  isClosingAction,
  resolutionCodeLabel,
  type AlarmAction,
  type AlarmResolutionCode,
  type AlarmStatus,
} from '@/lib/alarms/alarmTreatment';

export interface AlarmTreatmentTarget {
  id: string;
  title: string;
  status: AlarmStatus;
  triggeredAt: string;
  cameraName?: string | null;
}

interface AlarmTreatmentDialogProps {
  alarm: AlarmTreatmentTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_TONE: Record<AlarmStatus, string> = {
  open: 'bg-destructive text-destructive-foreground',
  acknowledged: 'bg-warning text-warning-foreground',
  resolved: 'bg-primary text-primary-foreground',
  dismissed: 'bg-muted text-muted-foreground',
};

const ACTION_ICON: Record<AlarmAction, typeof Check> = {
  acknowledge: Check,
  resolve: ShieldAlert,
  dismiss: X,
  reopen: Undo2,
};

export function AlarmTreatmentDialog({ alarm, open, onOpenChange }: AlarmTreatmentDialogProps) {
  const { user } = useAuth();
  const [action, setAction] = useState<AlarmAction | null>(null);
  const [note, setNote] = useState('');
  const [code, setCode] = useState<AlarmResolutionCode | ''>('');

  const treatments = useAlarmTreatments(open && alarm ? alarm.id : null);
  const treat = useTreatAlarm();

  const actions = alarm ? allowedActions(alarm.status) : [];
  const closing = action ? isClosingAction(action) : false;

  // Mesma regra do servidor: o botão só habilita quando a tratativa é aceita.
  const verdict = useMemo(() => {
    if (!alarm || !action) return null;
    return evaluateTreatment(
      { status: alarm.status },
      {
        action,
        actorId: user?.id ?? '',
        note,
        code: code || null,
        now: Date.now(),
      }
    );
  }, [alarm, action, note, code, user?.id]);

  const reset = () => {
    setAction(null);
    setNote('');
    setCode('');
  };

  const submit = () => {
    if (!alarm || !action || !user) return;
    treat.mutate(
      {
        alertId: alarm.id,
        action,
        note: note || null,
        code: code || null,
        snapshot: { status: alarm.status },
        actorId: user.id,
      },
      {
        onSuccess: () => {
          reset();
          onOpenChange(false);
        },
      }
    );
  };

  if (!alarm) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="truncate">{alarm.title}</DialogTitle>
          <DialogDescription>
            {alarm.cameraName ?? 'Sem câmera'} ·{' '}
            {format(new Date(alarm.triggeredAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Estado atual:</span>
            <Badge className={STATUS_TONE[alarm.status]}>{alarmStatusLabel(alarm.status)}</Badge>
          </div>

          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma ação disponível para este estado.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {actions.map((a) => {
                const Icon = ACTION_ICON[a];
                return (
                  <Button
                    key={a}
                    type="button"
                    size="sm"
                    variant={action === a ? 'default' : 'outline'}
                    onClick={() => {
                      setAction(a);
                      setCode('');
                    }}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {alarmActionLabel(a)}
                  </Button>
                );
              })}
            </div>
          )}

          {closing && action && (
            <div className="space-y-2">
              <Label htmlFor="alarm-code">Código de desfecho</Label>
              <Select value={code} onValueChange={(v) => setCode(v as AlarmResolutionCode)}>
                <SelectTrigger id="alarm-code">
                  <SelectValue placeholder="Selecione o desfecho" />
                </SelectTrigger>
                <SelectContent>
                  {allowedCodes(action).map((c) => (
                    <SelectItem key={c} value={c}>
                      {resolutionCodeLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action && (
            <div className="space-y-2">
              <Label htmlFor="alarm-note">
                {closing ? 'Motivo do desfecho (obrigatório)' : 'Observação (opcional)'}
              </Label>
              <Textarea
                id="alarm-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Descreva o que foi verificado e a providência tomada"
                rows={3}
                maxLength={2000}
              />
            </div>
          )}

          {action && verdict && !verdict.ok && (
            <p className="text-sm text-destructive">{verdict.message}</p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!action || !verdict?.ok || treat.isPending}>
              Registrar tratativa
            </Button>
          </div>

          <div className="border-t pt-3">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <History className="h-4 w-4" /> Histórico de tratativas
            </h4>
            <ScrollArea className="max-h-48 pr-3">
              <div className="space-y-2">
                {treatments.isLoading && <Skeleton className="h-10 w-full" />}
                {!treatments.isLoading && (treatments.data?.length ?? 0) === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma tratativa registrada.</p>
                )}
                {treatments.data?.map((t) => (
                  <div key={t.id} className="rounded-md border border-border p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">
                        {alarmActionLabel(t.action)}
                        {t.resolution_code ? ` · ${resolutionCodeLabel(t.resolution_code)}` : ''}
                      </span>
                      <span className="text-muted-foreground">
                        {format(new Date(t.acted_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    {t.note && <p className="text-muted-foreground mt-1">{t.note}</p>}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
