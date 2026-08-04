/**
 * VISÃO - Rule Card Component
 */
import { motion } from 'framer-motion';
import { Trash2, Edit2, Clock, MapPin, FlaskConical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DbRule } from '@/types/rules';
import { cn } from '@/lib/utils';
import { CATEGORIES, SEVERITIES } from './constants';
import { TestModeDialog } from '@/components/testMode/TestModeDialog';

interface RuleCardProps {
  rule: DbRule;
  zoneName?: string | null;
  onEdit: (rule: DbRule) => void;
  onToggle: (id: string, active: boolean) => void;
  onDelete: (id: string) => void;
}

export function RuleCard({ rule, zoneName, onEdit, onToggle, onDelete }: RuleCardProps) {
  const CategoryIcon =
    CATEGORIES.find((c) => c.value === rule.category)?.icon || CATEGORIES[0]!.icon;
  const severity = SEVERITIES.find((s) => s.value === rule.severity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className={cn('transition-all', !rule.is_active && 'opacity-60')}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
              <div
                className={cn(
                  'p-2 rounded-lg shrink-0',
                  rule.is_active ? 'bg-primary/10' : 'bg-muted'
                )}
              >
                <CategoryIcon
                  className={cn(
                    'h-5 w-5',
                    rule.is_active ? 'text-primary' : 'text-muted-foreground'
                  )}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-medium truncate">{rule.name}</h3>
                  <Badge
                    variant="outline"
                    className={cn('text-xs', severity?.color, 'bg-opacity-20 border-0')}
                  >
                    {severity?.label}
                  </Badge>
                  {!rule.is_active && <Badge variant="secondary">Inativo</Badge>}
                  {zoneName && (
                    <Badge variant="outline" className="gap-1 text-xs">
                      <MapPin className="h-3 w-3" /> {zoneName}
                    </Badge>
                  )}
                </div>
                {rule.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{rule.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                  <span>
                    {Array.isArray(rule.conditions) ? (rule.conditions as unknown[]).length : 0}{' '}
                    condição(ões)
                  </span>
                  <span>•</span>
                  <span>{rule.actions.length} ação(ões)</span>
                  {rule.cameras.length > 0 && (
                    <>
                      <span>•</span>
                      <span>{rule.cameras.length} câmera(s)</span>
                    </>
                  )}
                  {rule.schedule && (
                    <>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>Agendado</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Switch
                checked={rule.is_active}
                onCheckedChange={(checked) => onToggle(rule.id, checked)}
              />
              <TestModeDialog
                fixedScope="rule"
                fixedScopeIds={[rule.id]}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Modo teste (dry-run) desta regra"
                    aria-label="Ativar modo teste desta regra"
                  >
                    <FlaskConical className="h-4 w-4 text-warning" />
                  </Button>
                }
              />
              <Button variant="ghost" size="icon" onClick={() => onEdit(rule)}>
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                onClick={() => onDelete(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
