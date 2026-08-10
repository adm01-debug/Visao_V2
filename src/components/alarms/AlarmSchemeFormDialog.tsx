/**
 * Onda 218 — Formulário de criação/edição do esquema de alarme.
 *
 * O diálogo julga **enquanto se digita** com a mesma régua da Onda 215 e a
 * mesma contagem da Onda 217: o botão "Salvar" só habilita quando o cadastro
 * passaria também no banco. Avisos degradantes aparecem, mas não travam —
 * apagar/impedir é pior que avisar em destaque (Onda 216).
 */

import { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import {
  ALARM_EVENT_CATALOG,
  DISCONNECT_THRESHOLD_DEFAULT_S,
  DISCONNECT_THRESHOLD_MAX_S,
  DISCONNECT_THRESHOLD_MIN_S,
} from '@/lib/alarms/alarmScheme';
import {
  ALARM_ACTION_KINDS,
  ALARM_ACTION_LABEL,
  admitSchemeSubmission,
  emptyActionRow,
  emptyFormState,
  type AlarmActionFormRow,
  type AlarmSchemeFormState,
} from '@/lib/alarms/alarmSchemeForm';
import { SchemeAdmissionError, useSaveAlarmScheme } from '@/hooks/useSaveAlarmScheme';
import { useSchemeCatalog } from '@/hooks/useSchemeCatalog';
import { CatalogSelector } from '@/components/alarms/CatalogSelector';
import { AlarmScheduleEditor } from '@/components/alarms/AlarmScheduleEditor';
import type { AlarmActionKind } from '@/lib/alarms/alarmScheme';

interface AlarmSchemeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Ausente = criação. */
  initial?: AlarmSchemeFormState | null;
}

export function AlarmSchemeFormDialog({
  open,
  onOpenChange,
  initial = null,
}: AlarmSchemeFormDialogProps) {
  const [form, setForm] = useState<AlarmSchemeFormState>(() => initial ?? emptyFormState());
  const { toast } = useToast();
  const save = useSaveAlarmScheme();

  useEffect(() => {
    if (open) setForm(initial ?? emptyFormState());
  }, [open, initial]);

  // Onda 220 — o catálogo real alimenta o contexto de S6: sem ele, o
  // julgamento continua (só não verifica o vínculo da biblioteca).
  const catalog = useSchemeCatalog(open);
  const admission = useMemo(
    () => admitSchemeSubmission(form, catalog.context),
    [form, catalog.context]
  );

  const patch = (partial: Partial<AlarmSchemeFormState>) =>
    setForm((prev) => ({ ...prev, ...partial }));

  const patchAction = (index: number, partial: Partial<AlarmActionFormRow>) =>
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((row, i) => (i === index ? { ...row, ...partial } : row)),
    }));

  const removeAction = (index: number) =>
    setForm((prev) => ({ ...prev, actions: prev.actions.filter((_, i) => i !== index) }));

  const isDisconnect = form.eventType === 'device_disconnected';
  const isFaceRecognized = form.eventType === 'face_recognized';

  const handleSubmit = async () => {
    try {
      await save.mutateAsync(form);
      toast({
        title: form.id ? 'Esquema atualizado' : 'Esquema criado',
        description: 'O cadastro passou na pré-validação e foi aceito pelo servidor.',
      });
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof SchemeAdmissionError
          ? err.reasons.join(' ')
          : err instanceof Error
            ? err.message
            : 'Falha desconhecida ao gravar.';
      toast({ title: 'Cadastro recusado', description: message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {form.id ? 'Editar esquema de alarme' : 'Novo esquema de alarme'}
          </DialogTitle>
          <DialogDescription>
            O cadastro é julgado pela mesma régua da tela e do banco. Nada é gravado enquanto houver
            impedimento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="scheme-name">Nome</Label>
              <Input
                id="scheme-name"
                value={form.name}
                maxLength={200}
                onChange={(e) => patch({ name: e.target.value })}
                placeholder="Ex.: Cerca virtual — doca de carga"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheme-event">Tipo de evento</Label>
              <Select value={form.eventType} onValueChange={(v) => patch({ eventType: v })}>
                <SelectTrigger id="scheme-event">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {ALARM_EVENT_CATALOG.map((spec) => (
                    <SelectItem key={spec.type} value={spec.type}>
                      {spec.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CatalogSelector
              id="scheme-sources"
              label="Origens (canais/dispositivos)"
              description="Somente câmeras existentes podem ser escolhidas — digitar identificador acabou na Onda 220."
              snapshot={catalog.cameras}
              value={form.sources}
              onChange={(next) => patch({ sources: next })}
              emptyLabel="Nenhuma câmera cadastrada."
            />

            <div className="space-y-2">
              <Label htmlFor="scheme-missing-sources">Origens removidas (auditoria)</Label>
              <Input
                id="scheme-missing-sources"
                value={form.missingSources}
                onChange={(e) => patch({ missingSources: e.target.value })}
                placeholder="cam-09"
              />
              <p className="text-xs text-muted-foreground">
                Mantidas à vista: o esquema degrada, não some.
              </p>
            </div>
          </div>

          {isFaceRecognized && (
            <CatalogSelector
              id="scheme-libraries"
              label="Biblioteca de faces (exatamente uma)"
              description="A biblioteca precisa estar carregada em alguma origem viva do esquema."
              snapshot={catalog.libraries}
              value={form.faceLibraries}
              onChange={(next) => patch({ faceLibraries: next })}
              mode="single"
              emptyLabel="Nenhuma lista de faces ativa encontrada."
            />
          )}

          {isDisconnect && (
            <div className="space-y-2">
              <Label htmlFor="scheme-threshold">
                Limiar de desconexão (s) — {DISCONNECT_THRESHOLD_MIN_S} a{' '}
                {DISCONNECT_THRESHOLD_MAX_S}
              </Label>
              <Input
                id="scheme-threshold"
                inputMode="numeric"
                value={form.disconnectThresholdS}
                onChange={(e) => patch({ disconnectThresholdS: e.target.value })}
                placeholder={String(DISCONNECT_THRESHOLD_DEFAULT_S)}
              />
              <p className="text-xs text-muted-foreground">Desconexão manual nunca vira alarme.</p>
            </div>
          )}

          <AlarmScheduleEditor value={form.schedule} onChange={(schedule) => patch({ schedule })} />

          {/* Ações */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Ações</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {admission.storedTotal}/{admission.storedLimit} canais
              </span>
            </div>

            {form.actions.map((row, index) => (
              <div
                key={row.id}
                className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <div className="space-y-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select
                    value={row.kind}
                    onValueChange={(v) => patchAction(index, { kind: v as AlarmActionKind })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALARM_ACTION_KINDS.map((kind) => (
                        <SelectItem key={kind} value={kind}>
                          {ALARM_ACTION_LABEL[kind]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Canais exibidos</Label>
                  <Input
                    value={row.displayChannels}
                    onChange={(e) => patchAction(index, { displayChannels: e.target.value })}
                    placeholder="cam-01"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Canais gravados</Label>
                  <Input
                    value={row.recordChannels}
                    onChange={(e) => patchAction(index, { recordChannels: e.target.value })}
                    placeholder="cam-01"
                  />
                </div>

                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remover ação ${index + 1}`}
                    onClick={() => removeAction(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setForm((prev) => ({ ...prev, actions: [...prev.actions, emptyActionRow()] }))
              }
            >
              <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
              Adicionar ação
            </Button>
          </section>

          <div className="flex items-center gap-3">
            <Switch
              id="scheme-enabled"
              checked={form.enabled}
              onCheckedChange={(v) => patch({ enabled: v })}
            />
            <Label htmlFor="scheme-enabled">Habilitado</Label>
          </div>

          {/* Veredito */}
          {admission.refusals.length > 0 && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Gravação bloqueada</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {admission.refusals.map((r) => (
                    <li key={r.code}>
                      {r.message}
                      {r.refs.length > 0 && (
                        <span className="ml-1 opacity-80">({r.refs.join(', ')})</span>
                      )}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {admission.degrading.length > 0 && (
            <Alert className="border-warning/40 bg-warning/10">
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
              <AlertTitle>Grava, mas nasce inconsistente</AlertTitle>
              <AlertDescription>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-sm">
                  {admission.degrading.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!admission.allowed || save.isPending}
            onClick={handleSubmit}
            className={cn(!admission.allowed && 'cursor-not-allowed')}
          >
            {save.isPending ? 'Gravando…' : 'Salvar esquema'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AlarmSchemeFormDialog;
