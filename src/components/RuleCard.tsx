import { 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  Lock,
  Bell,
  Video,
  Volume2,
  Clock,
  Camera,
  MoreVertical,
  Pencil,
  Trash2,
  Power
} from 'lucide-react';
import { Rule } from '@/types/surveillance';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface RuleCardProps {
  rule: Rule;
  onToggle: (id: string, isActive: boolean) => void;
  onEdit: (rule: Rule) => void;
  onDelete: (id: string) => void;
}

const categoryConfig: Record<string, { icon: typeof Shield; label: string; color: string }> = {
  security: { icon: Shield, label: 'Segurança', color: 'text-blue-400' },
  productivity: { icon: TrendingUp, label: 'Produtividade', color: 'text-emerald-400' },
  safety: { icon: AlertTriangle, label: 'Segurança do Trabalho', color: 'text-amber-400' },
  intrusion: { icon: Lock, label: 'Intrusão', color: 'text-red-400' },
};

const severityConfig: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'alert' }> = {
  low: { label: 'Baixa', variant: 'default' },
  medium: { label: 'Média', variant: 'warning' },
  high: { label: 'Alta', variant: 'alert' },
  critical: { label: 'Crítica', variant: 'alert' },
};

const actionIcons: Record<string, typeof Bell> = {
  alert: AlertTriangle,
  notification: Bell,
  record: Video,
  alarm: Volume2,
};

export function RuleCard({ rule, onToggle, onEdit, onDelete }: RuleCardProps) {
  const CategoryIcon = categoryConfig[rule.category]?.icon || Shield;
  const categoryInfo = categoryConfig[rule.category];
  const severityInfo = severityConfig[rule.severity];

  return (
    <div className={`glass-card p-5 transition-all duration-200 ${!rule.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`p-2 rounded-lg bg-secondary/50 ${categoryInfo?.color}`}>
            <CategoryIcon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{rule.name}</h3>
              <Badge variant={severityInfo?.variant || 'default'}>
                {severityInfo?.label}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {rule.description}
            </p>

            {/* Actions & Schedule */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div className="flex items-center gap-1">
                {rule.actions.map(action => {
                  const ActionIcon = actionIcons[action] || Bell;
                  return (
                    <div
                      key={action}
                      className="p-1.5 rounded bg-secondary/30"
                      title={action}
                    >
                      <ActionIcon className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  );
                })}
              </div>

              {rule.schedule.enabled && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{rule.schedule.startTime} - {rule.schedule.endTime}</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Camera className="w-3.5 h-3.5" />
                <span>
                  {rule.cameras.length === 0 
                    ? 'Todas as câmeras' 
                    : `${rule.cameras.length} câmera${rule.cameras.length > 1 ? 's' : ''}`
                  }
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            checked={rule.isActive}
            onCheckedChange={(checked) => onToggle(rule.id, checked)}
          />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(rule)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggle(rule.id, !rule.isActive)}>
                <Power className="w-4 h-4 mr-2" />
                {rule.isActive ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(rule.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
