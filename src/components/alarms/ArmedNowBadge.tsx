/**
 * Onda 223 — selo "está armado agora?".
 *
 * Puramente apresentacional: o veredito vem da régua `armedNow.ts`. O pulso só
 * aparece quando a vigilância está de fato valendo — nunca em degradado grave,
 * nunca em inoperante.
 */

import {
  CircleSlash,
  Clock,
  PowerOff,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { ArmedVerdict } from '@/lib/alarms/armedNow';

const ICONS = {
  armed: ShieldCheck,
  armed_degraded: ShieldAlert,
  idle: Clock,
  off: PowerOff,
  inoperative: CircleSlash,
  unknown: ShieldQuestion,
} as const;

const TONES: Record<ArmedVerdict['state'], string> = {
  armed: 'border-success/40 bg-success/10 text-success',
  armed_degraded: 'border-warning/40 bg-warning/10 text-warning',
  idle: 'border-border bg-muted/40 text-muted-foreground',
  off: 'border-border bg-muted/40 text-muted-foreground',
  inoperative: 'border-destructive/40 bg-destructive/10 text-destructive',
  unknown: 'border-border bg-muted/40 text-muted-foreground',
};

const SHORT: Record<ArmedVerdict['state'], string> = {
  armed: 'Armado',
  armed_degraded: 'Armado (ressalva)',
  idle: 'Fora da janela',
  off: 'Desabilitado',
  inoperative: 'Não dispara',
  unknown: 'Indeterminado',
};

export function ArmedNowBadge({ verdict }: { verdict: ArmedVerdict }) {
  const Icon = ICONS[verdict.state];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn('gap-1 whitespace-nowrap font-normal', TONES[verdict.state])}
          aria-label={verdict.label}
        >
          <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
            {verdict.effective && (
              <span
                className={cn(
                  'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                  verdict.state === 'armed' ? 'bg-success' : 'bg-warning'
                )}
              />
            )}
            <span
              className={cn(
                'relative inline-flex h-2 w-2 rounded-full',
                verdict.effective
                  ? verdict.state === 'armed'
                    ? 'bg-success'
                    : 'bg-warning'
                  : 'bg-muted-foreground/50'
              )}
            />
          </span>
          <Icon className="h-3 w-3" aria-hidden="true" />
          {SHORT[verdict.state]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{verdict.label}</TooltipContent>
    </Tooltip>
  );
}
