/**
 * Onda 131 — Controle de silenciamento da caixa de entrada colaborativa.
 *
 * O componente não decide o que pode ser silenciado: ele lista exatamente
 * `SILENCEABLE_KINDS`, que é derivado das mesmas regras aplicadas pelo banco.
 * Convite recebido e participação removida sequer aparecem aqui — não por
 * escolha visual, mas porque silenciá-los é proibido no servidor.
 */

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { BellOff } from 'lucide-react';
import {
  COLLAB_SILENCE_POLICY,
  SILENCEABLE_KINDS,
  type CollabSilenceKindLabel,
} from '@/lib/collab/collabNotificationSilencing';
import { useCollabSilence } from '@/hooks/useCollabSilence';

const DAY_MS = 86_400_000;
const DURATIONS = [
  { label: '24 horas', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
] as const;

export interface CollabSilenceControlProps {
  organizationId: string | null;
  kindLabel: CollabSilenceKindLabel;
}

export function CollabSilenceControl({ organizationId, kindLabel }: CollabSilenceControlProps) {
  const { preference, silence, clear } = useCollabSilence(organizationId);
  const active = preference.data;
  const now = Date.now();

  const isActive = useMemo(
    () => active !== null && active !== undefined && Date.parse(active.silencedUntil) > now,
    [active, now]
  );

  const [selected, setSelected] = useState<readonly string[]>([]);
  const [days, setDays] = useState<number>(7);

  const chosen = selected.length > 0 ? selected : (active?.silencedKinds ?? []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" disabled={organizationId === null}>
          <BellOff className="mr-2 h-4 w-4" aria-hidden="true" />
          Silenciar
          {isActive && (
            <Badge variant="secondary" className="ml-2">
              {active?.silencedKinds.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 space-y-4" align="end">
        <div className="space-y-1">
          <p className="text-sm font-medium">Silenciar tipos de aviso</p>
          <p className="text-xs text-muted-foreground">
            Silenciar não apaga: o aviso continua na lista, apenas deixa de contar como não lido.
            Convites e perdas de acesso nunca podem ser silenciados.
          </p>
        </div>

        <div className="space-y-2">
          {SILENCEABLE_KINDS.map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <Checkbox
                id={`silence-${kind}`}
                checked={chosen.includes(kind)}
                onCheckedChange={(checked) =>
                  setSelected((prev) => {
                    const base = prev.length > 0 ? prev : (active?.silencedKinds ?? []);
                    return checked === true
                      ? [...new Set([...base, kind])]
                      : base.filter((k) => k !== kind);
                  })
                }
              />
              <Label htmlFor={`silence-${kind}`} className="text-sm font-normal">
                {kindLabel[kind]}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {DURATIONS.map((option) => (
            <Button
              key={option.days}
              size="sm"
              variant={days === option.days ? 'default' : 'outline'}
              onClick={() => setDays(option.days)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {isActive && active && (
          <p className="text-xs text-muted-foreground">
            Silêncio ativo até {new Date(active.silencedUntil).toLocaleString('pt-BR')} (limite de{' '}
            {COLLAB_SILENCE_POLICY.maxSilenceDays} dias).
          </p>
        )}

        <div className="flex justify-between gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={!isActive || clear.isPending}
            onClick={() => clear.mutate()}
          >
            Reativar avisos
          </Button>
          <Button
            size="sm"
            disabled={chosen.length === 0 || silence.isPending}
            onClick={() =>
              silence.mutate({ kinds: chosen, until: new Date(Date.now() + days * DAY_MS) })
            }
          >
            Silenciar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
