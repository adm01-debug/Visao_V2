import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import type { NotificationConfig } from './types';
import { SEVERITY_OPTIONS } from './types';

const ICONS = { Info, AlertCircle, AlertTriangle, Shield } as const;

interface FiltersTabProps {
  config: NotificationConfig;
  onToggleSeverity: (severity: string) => void;
}

export function FiltersTab({ config, onToggleSeverity }: FiltersTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />Filtros de Severidade
        </CardTitle>
        <CardDescription>Escolha quais tipos de alertas deseja receber</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SEVERITY_OPTIONS.map((severity) => {
            const Icon = ICONS[severity.icon];
            const isActive = config.severity_filter.includes(severity.value);
            return (
              <button key={severity.value} onClick={() => onToggleSeverity(severity.value)}
                className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                  isActive ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                }`}>
                <div className={`p-2 rounded-full ${severity.color}`}>
                  <Icon className="h-5 w-5 text-foreground" />
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {severity.label}
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-sm text-muted-foreground text-center mt-4">
          {config.severity_filter.length === 0
            ? 'Nenhum filtro selecionado - você não receberá notificações'
            : `Você receberá notificações de severidade: ${config.severity_filter.join(', ')}`}
        </p>
      </CardContent>
    </Card>
  );
}
