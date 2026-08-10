import { Radio, Wifi, WifiOff } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useActiveRelayAgents } from '@/hooks/useActiveRelayAgents';

interface RelayAgentSelectorProps {
  value: string | null;
  onChange: (agentId: string | null) => void;
  /** Compact mode omite label e usa largura mínima (útil em toolbars). */
  compact?: boolean;
  className?: string;
  disabled?: boolean;
}

const DIRECT = '__direct__';

/**
 * Seletor unificado de Agente Local para rotear comandos (PTZ, port-probe,
 * autodiscover). Mostra estado online e tempo desde o último heartbeat.
 */
export function RelayAgentSelector({
  value,
  onChange,
  compact = false,
  className,
  disabled,
}: RelayAgentSelectorProps) {
  const { data: agents = [], isLoading } = useActiveRelayAgents();

  const selectValue = value ?? DIRECT;
  const selected = agents.find((a) => a.id === value);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {!compact && (
        <label className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Radio className="h-3 w-3" />
          Rota do comando
        </label>
      )}
      <Select
        value={selectValue}
        onValueChange={(v) => onChange(v === DIRECT ? null : v)}
        disabled={disabled || isLoading}
      >
        <SelectTrigger className={cn(compact ? 'h-8 text-xs' : 'h-9')}>
          <SelectValue placeholder="Direto (Cloud → Câmera)" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DIRECT}>
            <div className="flex items-center gap-2">
              <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Direto (Cloud → Câmera)</span>
            </div>
          </SelectItem>
          {agents.length === 0 && !isLoading && (
            <SelectItem value="__none__" disabled>
              <span className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="h-3.5 w-3.5" />
                Nenhum agente ativo
              </span>
            </SelectItem>
          )}
          {agents.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-60" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="font-medium">{agent.name}</span>
                {agent.last_seen_at && (
                  <span className="text-[11px] text-muted-foreground">
                    · {formatDistanceToNowStrict(new Date(agent.last_seen_at), { locale: ptBR })}
                  </span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selected && !compact && (
        <Badge variant="outline" className="w-fit text-[10px] gap-1">
          <Radio className="h-2.5 w-2.5" />
          Via agente · {selected.network_cidr ?? 'LAN privada'}
        </Badge>
      )}
    </div>
  );
}
