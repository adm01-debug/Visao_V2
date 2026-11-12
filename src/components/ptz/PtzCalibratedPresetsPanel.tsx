import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, MapPin, Wand2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { usePtzControl } from '@/hooks/usePtzControl';

type Axis = 'pan' | 'tilt' | 'zoom';
export type CalibratedLimits = Record<Axis, { min: number; max: number }>;

interface PresetTemplate {
  id: string;
  name: string;
  /** Fatores relativos ao range calibrado. `null` = manter centro; `-1` = min; `1` = max; `0` = centro. */
  pan: -1 | 0 | 1 | null;
  tilt: -1 | 0 | 1 | null;
  /** Zoom em fração 0..1 do range calibrado. */
  zoom: number;
}

const TEMPLATES: PresetTemplate[] = [
  { id: 'home', name: 'Home (centro)', pan: 0, tilt: 0, zoom: 0 },
  { id: 'north', name: 'Norte (topo)', pan: 0, tilt: 1, zoom: 0 },
  { id: 'south', name: 'Sul (base)', pan: 0, tilt: -1, zoom: 0 },
  { id: 'east', name: 'Leste (direita)', pan: 1, tilt: 0, zoom: 0 },
  { id: 'west', name: 'Oeste (esquerda)', pan: -1, tilt: 0, zoom: 0 },
  { id: 'ne', name: 'Nordeste', pan: 1, tilt: 1, zoom: 0 },
  { id: 'nw', name: 'Noroeste', pan: -1, tilt: 1, zoom: 0 },
  { id: 'se', name: 'Sudeste', pan: 1, tilt: -1, zoom: 0 },
  { id: 'sw', name: 'Sudoeste', pan: -1, tilt: -1, zoom: 0 },
  { id: 'zwide', name: 'Zoom Wide', pan: 0, tilt: 0, zoom: 0 },
  { id: 'ztele', name: 'Zoom Tele', pan: 0, tilt: 0, zoom: 1 },
];

interface RunItem extends PresetTemplate {
  selected: boolean;
  status: 'idle' | 'moving' | 'saving' | 'ok' | 'error';
  presetNumber?: number;
  error?: string;
}

interface Props {
  ptz: ReturnType<typeof usePtzControl>;
  limits: CalibratedLimits;
  cameraId: string;
  protocol: string;
  onSaved?: () => void;
}

/**
 * Gera presets padronizados a partir dos limits calibrados usando
 * ONVIF AbsoluteMove (sem cálculo tempo→posição). Após atingir a posição
 * (confirmada por GetStatus IDLE), salva o preset nativamente no dome.
 */
export function PtzCalibratedPresetsPanel({
  ptz,
  limits,
  cameraId: _cameraId,
  protocol,
  onSaved,
}: Props) {
  const isOnvif = protocol === 'onvif';

  // Menor preset livre entre 1..255 dado os já cadastrados.
  const usedNumbers = useMemo(
    () => new Set(ptz.presets.map((p) => p.preset_number)),
    [ptz.presets]
  );
  const allocateNumbers = (count: number): number[] => {
    const out: number[] = [];
    const taken = new Set(usedNumbers);
    for (let n = 1; n <= 255 && out.length < count; n++) {
      if (!taken.has(n)) {
        out.push(n);
        taken.add(n);
      }
    }
    return out;
  };

  const [items, setItems] = useState<RunItem[]>(() =>
    TEMPLATES.map((t) => ({
      ...t,
      selected: t.id === 'home' || t.id === 'zwide' || t.id === 'ztele',
      status: 'idle',
    }))
  );
  const [namePrefix, setNamePrefix] = useState('Cal');

  const project = (t: PresetTemplate) => {
    const mapAxis = (axis: Axis, factor: -1 | 0 | 1 | null): number | undefined => {
      if (factor === null) return undefined;
      const { min, max } = limits[axis];
      if (factor === 0) return (min + max) / 2;
      return factor === -1 ? min : max;
    };
    const zoomVal = (() => {
      const { min, max } = limits.zoom;
      return min + (max - min) * Math.max(0, Math.min(1, t.zoom));
    })();
    return {
      pan: mapAxis('pan', t.pan) ?? 0,
      tilt: mapAxis('tilt', t.tilt) ?? 0,
      zoom: zoomVal,
    };
  };

  // Aguarda o dome parar (MoveStatus=IDLE) por GetStatus. Timeout em `budgetMs`.
  const waitIdle = async (budgetMs = 8000): Promise<'idle' | 'timeout' | 'unsupported'> => {
    const started = Date.now();
    let sawStatus = false;
    while (Date.now() - started < budgetMs) {
      const st = await ptz.getStatus();
      if (!st) return sawStatus ? 'timeout' : 'unsupported';
      sawStatus = true;
      const stillMoving = st.moving?.pan_tilt === true || st.moving?.zoom === true;
      if (!stillMoving) return 'idle';
      await new Promise((r) => setTimeout(r, 400));
    }
    return 'timeout';
  };

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!isOnvif) throw new Error('absolute_move_requer_onvif');
      const selected = items.filter((i) => i.selected);
      if (selected.length === 0) throw new Error('Selecione ao menos um preset');
      const numbers = allocateNumbers(selected.length);
      if (numbers.length < selected.length) throw new Error('Sem preset_number livre (limite 255)');

      let idx = 0;
      for (const t of selected) {
        const presetNumber = numbers[idx++]!;
        const pos = project(t);
        setItems((prev) =>
          prev.map((p) =>
            p.id === t.id ? { ...p, status: 'moving', presetNumber, error: undefined } : p
          )
        );
        try {
          await ptz.absoluteMove({ ...pos, speed: 6 });
          await waitIdle(8000);
          setItems((prev) => prev.map((p) => (p.id === t.id ? { ...p, status: 'saving' } : p)));
          const presetName = `${namePrefix.trim() || 'Cal'} · ${t.name}`.slice(0, 60);
          await ptz.savePreset(presetNumber, presetName);
          setItems((prev) => prev.map((p) => (p.id === t.id ? { ...p, status: 'ok' } : p)));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setItems((prev) =>
            prev.map((p) => (p.id === t.id ? { ...p, status: 'error', error: msg } : p))
          );
        }
      }
    },
    onSuccess: () => {
      const ok = items.filter((i) => i.status === 'ok').length;
      if (ok > 0) toast.success(`${ok} preset(s) calibrado(s) salvos no dome`);
      onSaved?.();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string, selected: boolean) =>
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, selected } : p)));

  const toggleAll = (v: boolean) => setItems((prev) => prev.map((p) => ({ ...p, selected: v })));
  const selectedCount = items.filter((i) => i.selected).length;

  return (
    <div className="space-y-3">
      <Separator />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Wand2 className="w-4 h-4 text-primary" /> Gerar presets a partir da calibração
          </p>
          <p className="text-xs text-muted-foreground">
            Usa <b>AbsoluteMove ONVIF</b> para posicionar o dome exatamente nos pontos derivados dos
            limits calibrados e salva o preset nativamente, sem depender do cálculo tempo→posição.
          </p>
        </div>
        <Input
          value={namePrefix}
          onChange={(e) => setNamePrefix(e.target.value)}
          maxLength={20}
          className="h-8 w-32"
          placeholder="Prefixo"
          aria-label="Prefixo do nome do preset"
        />
      </div>

      {!isOnvif && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Driver sem AbsoluteMove</AlertTitle>
          <AlertDescription>
            O driver <b>{protocol}</b> não expõe posicionamento absoluto padronizado. Para usar este
            recurso, reconfigure o PTZ da câmera com o protocolo ONVIF ou salve os presets
            manualmente via joystick.
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border border-border/60">
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Checkbox
              id="ptz-cal-all"
              checked={selectedCount === items.length}
              onCheckedChange={(v) => toggleAll(Boolean(v))}
            />
            <label htmlFor="ptz-cal-all" className="cursor-pointer">
              Selecionar todos ({selectedCount}/{items.length})
            </label>
          </div>
          <Badge variant="secondary">
            Range Pan {limits.pan.min.toFixed(2)}…{limits.pan.max.toFixed(2)}
          </Badge>
        </div>
        <ScrollArea className="h-64">
          <ul className="divide-y divide-border/60">
            {items.map((t) => {
              const pos = project(t);
              return (
                <li key={t.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                  <Checkbox
                    checked={t.selected}
                    disabled={runMutation.isPending || !isOnvif}
                    onCheckedChange={(v) => toggle(t.id, Boolean(v))}
                    aria-label={`Selecionar ${t.name}`}
                  />
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                  <span className="flex-1">{t.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    p{pos.pan.toFixed(2)} t{pos.tilt.toFixed(2)} z{pos.zoom.toFixed(2)}
                  </span>
                  <StatusPill item={t} />
                </li>
              );
            })}
          </ul>
        </ScrollArea>
        <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3 py-2">
          <p className="text-[11px] text-muted-foreground">
            Os presets ficam salvos no dome — o acesso via <code>goto_preset</code> não usa mais
            tempo→posição.
          </p>
          <Button
            size="sm"
            onClick={() => runMutation.mutate()}
            disabled={runMutation.isPending || selectedCount === 0 || !isOnvif}
          >
            {runMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
            Gerar {selectedCount} preset(s)
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ item }: { item: RunItem }) {
  if (item.status === 'idle') return null;
  if (item.status === 'moving')
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> movendo
      </Badge>
    );
  if (item.status === 'saving')
    return (
      <Badge variant="outline" className="gap-1">
        <Loader2 className="w-3 h-3 animate-spin" /> salvando
      </Badge>
    );
  if (item.status === 'ok')
    return (
      <Badge
        variant="secondary"
        className="gap-1"
        title={item.presetNumber ? `#${item.presetNumber}` : undefined}
      >
        <CheckCircle2 className="w-3 h-3 text-success" /> #{item.presetNumber}
      </Badge>
    );
  return (
    <Badge variant="destructive" className="gap-1" title={item.error}>
      <XCircle className="w-3 h-3" /> erro
    </Badge>
  );
}
