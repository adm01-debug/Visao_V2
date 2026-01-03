/**
 * VISÃO - Sistema de Vigilância Inteligente
 * RuleEngine Component - Displays and manages active rules
 */

import { memo, useState, useMemo } from 'react';
import { 
  Settings, 
  Plus, 
  Search,
  Filter,
  ToggleLeft,
  ToggleRight,
  Edit,
  Trash2,
  AlertTriangle,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RuleCategory = 'security' | 'safety' | 'operations' | 'access';

export interface Rule {
  id: string;
  name: string;
  description?: string;
  category: RuleCategory;
  severity: RuleSeverity;
  isActive: boolean;
  triggeredCount?: number;
  lastTriggered?: Date | string;
}

interface RuleEngineProps {
  rules: Rule[];
  onRuleToggle?: (ruleId: string, isActive: boolean) => void;
  onRuleEdit?: (rule: Rule) => void;
  onRuleDelete?: (ruleId: string) => void;
  onCreateRule?: () => void;
  className?: string;
}

const severityColors: Record<RuleSeverity, string> = {
  low: 'bg-secondary text-secondary-foreground',
  medium: 'bg-warning text-warning-foreground',
  high: 'bg-orange-500 text-white',
  critical: 'bg-destructive text-destructive-foreground',
};

const categoryLabels: Record<RuleCategory, string> = {
  security: 'Segurança',
  safety: 'Trabalho',
  operations: 'Operações',
  access: 'Acesso',
};

function RuleEngineComponent({
  rules,
  onRuleToggle,
  onRuleEdit,
  onRuleDelete,
  onCreateRule,
  className
}: RuleEngineProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<RuleCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredRules = useMemo(() => {
    return rules.filter(rule => {
      const matchesSearch = rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           rule.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || rule.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && rule.isActive) ||
                           (statusFilter === 'inactive' && !rule.isActive);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [rules, searchQuery, categoryFilter, statusFilter]);

  const activeCount = rules.filter(r => r.isActive).length;

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Motor de Regras
            <Badge variant="secondary">{activeCount}/{rules.length} ativas</Badge>
          </CardTitle>
          {onCreateRule && (
            <Button onClick={onCreateRule} size="sm" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova Regra
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar regras..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as RuleCategory | 'all')}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="inactive">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Rules List */}
        {filteredRules.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma regra encontrada</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className={cn(
                  "flex items-center gap-4 p-4 rounded-lg border transition-colors",
                  rule.isActive ? 'bg-card' : 'bg-muted/50 opacity-60'
                )}
              >
                {/* Toggle */}
                <Switch
                  checked={rule.isActive}
                  onCheckedChange={(checked) => onRuleToggle?.(rule.id, checked)}
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium truncate">{rule.name}</span>
                    <Badge className={severityColors[rule.severity]}>
                      {rule.severity}
                    </Badge>
                    <Badge variant="outline">
                      {categoryLabels[rule.category]}
                    </Badge>
                  </div>
                  {rule.description && (
                    <p className="text-sm text-muted-foreground truncate">{rule.description}</p>
                  )}
                  {rule.triggeredCount !== undefined && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Disparada {rule.triggeredCount} vezes
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {onRuleEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRuleEdit(rule)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  )}
                  {onRuleDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRuleDelete(rule.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export const RuleEngine = memo(RuleEngineComponent);
