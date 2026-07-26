import { memo, useState } from "react";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DEFAULT_PRODUCTIVITY_CONFIG,
  PRODUCTIVITY_EVENT_LABELS,
  WEEKDAY_LABELS,
  describeProductivityConfig,
  type ProductivityConfig,
  type ProductivityEventKind,
} from "@/lib/productivityConfig";

interface ProductivityConfigPanelProps {
  config: ProductivityConfig;
  onChange: (config: ProductivityConfig) => void;
  className?: string;
}

const hours = Array.from({ length: 24 }, (_, i) => i);

export const ProductivityConfigPanel = memo(function ProductivityConfigPanel({
  config,
  onChange,
  className,
}: ProductivityConfigPanelProps) {
  const [open, setOpen] = useState(false);

  const toggleEvent = (kind: ProductivityEventKind, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...config.events, kind]))
      : config.events.filter((e) => e !== kind);
    // Ao menos um tipo precisa permanecer ativo para a métrica fazer sentido.
    if (next.length === 0) return;
    onChange({ ...config, events: next });
  };

  const toggleWeekday = (day: number) => {
    const next = config.weekdays.includes(day)
      ? config.weekdays.filter((d) => d !== day)
      : [...config.weekdays, day].sort();
    if (next.length === 0) return;
    onChange({ ...config, weekdays: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)} data-testid="productivity-config-trigger">
          <SlidersHorizontal className="h-4 w-4" />
          Métricas de produtividade
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4 space-y-4" align="end">
        <div>
          <p className="font-medium">Cálculo de produtividade</p>
          <p className="text-xs text-muted-foreground mt-1">{describeProductivityConfig(config)}</p>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Eventos considerados</Label>
          {(Object.keys(PRODUCTIVITY_EVENT_LABELS) as ProductivityEventKind[]).map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <Checkbox
                id={`prod-event-${kind}`}
                checked={config.events.includes(kind)}
                onCheckedChange={(c) => toggleEvent(kind, c === true)}
              />
              <Label htmlFor={`prod-event-${kind}`} className="text-sm font-normal cursor-pointer">
                {PRODUCTIVITY_EVENT_LABELS[kind]}
              </Label>
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Janela de horário</Label>
          <div className="flex items-center gap-2">
            <Select
              value={String(config.startHour)}
              onValueChange={(v) => onChange({ ...config, startHour: Number(v) })}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {hours.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-sm">até</span>
            <Select
              value={String(config.endHour)}
              onValueChange={(v) => onChange({ ...config, endHour: Number(v) })}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {[...hours.slice(1), 24].map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {String(h % 24).padStart(2, "0")}:00
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {config.startHour > config.endHour && (
            <p className="text-xs text-muted-foreground">Janela noturna: cruza a meia-noite.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs uppercase text-muted-foreground">Dias da semana</Label>
          <div className="flex flex-wrap gap-1">
            {WEEKDAY_LABELS.map((label, day) => {
              const active = config.weekdays.includes(day);
              return (
                <Badge
                  key={label}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  variant={active ? "default" : "outline"}
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
              );
            })}
          </div>
        </div>

        <Separator />

        <Button
          variant="ghost"
          size="sm"
          className="w-full gap-2"
          onClick={() => onChange(DEFAULT_PRODUCTIVITY_CONFIG)}
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar padrão
        </Button>
      </PopoverContent>
    </Popover>
  );
});

export default ProductivityConfigPanel;
