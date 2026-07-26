import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Loader2, SlidersHorizontal, Cloud } from "lucide-react";
import { toast } from "sonner";
import {
  DEFAULT_PRODUCTIVITY_CONFIG,
  EVENT_TYPE_LABEL,
  PRODUCTIVITY_EVENT_TYPES,
  PRODUCTIVITY_PRESETS,
  PRODUCTIVITY_SEVERITIES,
  SEVERITY_LABEL,
  WEEKDAY_LABEL,
  matchPreset,
  timeToMinutes,
  type ProductivityConfig,
  type ProductivityEventType,
  type ProductivitySeverity,
} from "@/lib/productivityConfig";


export interface ProductivityConfigPanelProps {
  draft: ProductivityConfig;
  onDraftChange: (config: ProductivityConfig) => void;
  onReset: () => void;
  onSave: (config: ProductivityConfig) => Promise<unknown>;
  isSaving: boolean;
  isAuthenticated: boolean;
}

/**
 * Painel de critérios das métricas de produtividade.
 * Edita um rascunho local e só persiste no backend ao clicar em "Salvar".
 */
export function ProductivityConfigPanel({
  draft,
  onDraftChange,
  onReset,
  onSave,
  isSaving,
  isAuthenticated,
}: ProductivityConfigPanelProps) {
  const toggleEventType = (type: ProductivityEventType, checked: boolean) => {
    onDraftChange({
      ...draft,
      eventTypes: checked ? [...draft.eventTypes, type] : draft.eventTypes.filter((t) => t !== type),
    });
  };

  const toggleSeverity = (severity: ProductivitySeverity, checked: boolean) => {
    onDraftChange({
      ...draft,
      severities: checked
        ? [...draft.severities, severity]
        : draft.severities.filter((s) => s !== severity),
    });
  };

  const toggleWeekday = (day: number) => {
    onDraftChange({
      ...draft,
      weekdays: draft.weekdays.includes(day)
        ? draft.weekdays.filter((d) => d !== day)
        : [...draft.weekdays, day],
    });
  };

  const handleSave = async () => {
    if (timeToMinutes(draft.windowStart) === null || timeToMinutes(draft.windowEnd) === null) {
      toast.error("Horário inválido. Use o formato HH:mm.");
      return;
    }
    if (draft.eventTypes.length === 0) {
      toast.error("Selecione ao menos um tipo de evento.");
      return;
    }
    if (draft.weekdays.length === 0) {
      toast.error("Selecione ao menos um dia da semana.");
      return;
    }
    try {
      await onSave(draft);
      toast.success("Critérios salvos na sua conta");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar os critérios");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontal className="h-4 w-4 mr-2" />
          Critérios
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] space-y-4" align="end">
        <div>
          <p className="font-semibold text-sm">Métricas de produtividade</p>
          <p className="text-xs text-muted-foreground">
            Escolha quais eventos e janelas de tempo entram no cálculo.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Presets</Label>
          <div className="flex flex-wrap gap-1">
            {PRODUCTIVITY_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={activePreset?.id === preset.id ? "default" : "outline"}
                className="h-7 text-xs"
                title={preset.description}
                onClick={() => onDraftChange({ ...preset.config })}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {activePreset ? activePreset.description : "Configuração personalizada"}
          </p>
        </div>

        <Separator />

        <div className="space-y-2">

          <Label className="text-xs uppercase text-muted-foreground">Tipos de evento</Label>
          {PRODUCTIVITY_EVENT_TYPES.map((type) => (
            <div key={type} className="flex items-center gap-2">
              <Checkbox
                id={`event-${type}`}
                checked={draft.eventTypes.includes(type)}
                onCheckedChange={(v) => toggleEventType(type, v === true)}
              />
              <Label htmlFor={`event-${type}`} className="text-sm font-normal">
                {EVENT_TYPE_LABEL[type]}
              </Label>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Janela de tempo</Label>
          <div className="flex items-center gap-2">
            <Input
              type="time"
              aria-label="Início da janela"
              value={draft.windowStart}
              onChange={(e) => onDraftChange({ ...draft, windowStart: e.target.value })}
            />
            <span className="text-muted-foreground text-sm">até</span>
            <Input
              type="time"
              aria-label="Fim da janela"
              value={draft.windowEnd}
              onChange={(e) => onDraftChange({ ...draft, windowEnd: e.target.value })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Turnos que cruzam a meia-noite são suportados (ex.: 19:00 até 06:00).
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Dias da semana</Label>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_LABEL.map((label, day) => (
              <Badge
                key={label}
                role="button"
                tabIndex={0}
                variant={draft.weekdays.includes(day) ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => toggleWeekday(day)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggleWeekday(day);
                  }
                }}
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Severidades</Label>
          <div className="grid grid-cols-2 gap-1">
            {PRODUCTIVITY_SEVERITIES.map((severity) => (
              <div key={severity} className="flex items-center gap-2">
                <Checkbox
                  id={`sev-${severity}`}
                  checked={draft.severities.includes(severity)}
                  onCheckedChange={(v) => toggleSeverity(severity, v === true)}
                />
                <Label htmlFor={`sev-${severity}`} className="text-sm font-normal">
                  {SEVERITY_LABEL[severity]}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {!isAuthenticated && (
          <p className="text-xs text-warning">
            Faça login para salvar os critérios na sua conta.
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDraftChange(DEFAULT_PRODUCTIVITY_CONFIG)}
            disabled={isSaving}
          >
            Padrão
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset} disabled={isSaving}>
              Desfazer
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving || !isAuthenticated}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Cloud className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default ProductivityConfigPanel;
