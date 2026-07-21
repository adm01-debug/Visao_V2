/**
 * Onda Shinobi 3 — Seletor de Grupo de Monitoramento
 * Dropdown para alternar entre grupos + botão para abrir editor.
 */
import { memo } from 'react';
import { Layers, Plus, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { MonitorGroup } from '@/hooks/useMonitorGroups';

interface MonitorGroupSelectorProps {
  groups: MonitorGroup[];
  activeGroupId: string | null;
  onChange: (id: string | null) => void;
  onOpenEditor: () => void;
  onCreateNew: () => void;
}

function MonitorGroupSelectorImpl({
  groups,
  activeGroupId,
  onChange,
  onOpenEditor,
  onCreateNew,
}: MonitorGroupSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      <Select
        value={activeGroupId ?? '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? null : v)}
      >
        <SelectTrigger className="h-8 w-40 text-xs" aria-label="Grupo de monitoramento ativo">
          <SelectValue placeholder="Sem grupo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Sem grupo</SelectItem>
          {groups.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.name} · {g.layout}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onCreateNew}
            aria-label="Criar novo grupo"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Novo grupo</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenEditor}
            disabled={!activeGroupId}
            aria-label="Editar grupo"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Editar grupo</TooltipContent>
      </Tooltip>
    </div>
  );
}

export const MonitorGroupSelector = memo(MonitorGroupSelectorImpl);
