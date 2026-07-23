import { AlertTriangle, Radio, RadioTower, WifiOff, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useRelayAgentHealth } from "@/hooks/useRelayAgentHealth";
import { cn } from "@/lib/utils";

interface RelayHealthWatchdogProps {
  agentId: string | null;
  onFallbackDirect: () => void;
  className?: string;
}

/**
 * Watchdog que observa o Agente Local selecionado e emite um alerta visual
 * quando ele fica stale (2-5 min sem heartbeat), offline (> 5 min) ou some.
 * Oferece fallback com 1 clique para operar direto.
 */
export function RelayHealthWatchdog({
  agentId,
  onFallbackDirect,
  className,
}: RelayHealthWatchdogProps) {
  const health = useRelayAgentHealth(agentId);

  // Silencia quando: sem agente selecionado (direto) ou agente online.
  if (!agentId || health.status === "online" || health.status === "unknown") return null;

  const config = {
    stale: {
      icon: RadioTower,
      title: "Agente com heartbeat atrasado",
      variant: "default" as const,
      accent: "border-warning/50 bg-warning/5 text-warning-foreground",
      body: `Último sinal há ${health.ageSeconds ?? "?"}s. Comandos podem sofrer atraso ou falhar em segundos.`,
    },
    offline: {
      icon: WifiOff,
      title: "Agente Local offline",
      variant: "destructive" as const,
      accent: "border-destructive/50 bg-destructive/5",
      body: `Sem heartbeat há ${health.ageSeconds ? Math.floor(health.ageSeconds / 60) + "min" : "> 5min"}. Comandos via este agente serão rejeitados.`,
    },
    missing: {
      icon: AlertTriangle,
      title: "Agente removido",
      variant: "destructive" as const,
      accent: "border-destructive/50 bg-destructive/5",
      body: "O agente selecionado não existe mais (removido ou sem permissão). Selecione outro ou opere direto.",
    },
  }[health.status as "stale" | "offline" | "missing"];

  const Icon = config.icon;

  return (
    <Alert className={cn(config.accent, "py-2.5 px-3", className)}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="text-xs font-semibold flex items-center gap-1.5">
        {config.title}
        {health.name && (
          <span className="text-[10px] font-normal text-muted-foreground">
            <Radio className="inline h-2.5 w-2.5 mr-0.5" />
            {health.name}
          </span>
        )}
      </AlertTitle>
      <AlertDescription className="text-[11px] mt-1 flex items-center justify-between gap-2">
        <span>{config.body}</span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[11px] shrink-0"
          onClick={onFallbackDirect}
        >
          <X className="h-3 w-3 mr-1" />
          Operar direto
        </Button>
      </AlertDescription>
    </Alert>
  );
}
