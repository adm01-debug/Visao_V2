import { memo } from 'react';
import { AlertTriangle, Users, Camera, BarChart3, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: string[];
}

export const reportTypes: ReportType[] = [
  { id: 'alerts', title: 'Relatório de Alertas', description: 'Histórico completo de alertas com análise por severidade e câmera', icon: AlertTriangle, sections: ['summary', 'by-severity', 'by-camera', 'timeline'] },
  { id: 'recognition', title: 'Relatório de Reconhecimento', description: 'Logs de reconhecimento facial com estatísticas de detecção', icon: Users, sections: ['summary', 'by-person', 'by-camera', 'unknown'] },
  { id: 'cameras', title: 'Relatório de Câmeras', description: 'Status e atividade das câmeras do sistema', icon: Camera, sections: ['summary', 'status', 'activity'] },
  { id: 'analytics', title: 'Relatório Analítico', description: 'Análise consolidada com métricas e tendências', icon: BarChart3, sections: ['overview', 'trends', 'recommendations'] },
];

interface ReportTypeSelectorProps {
  selectedReport: string;
  onSelect: (id: string) => void;
}

export const ReportTypeSelector = memo(function ReportTypeSelector({ selectedReport, onSelect }: ReportTypeSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Tipo de Relatório</CardTitle>
        <CardDescription>Selecione o tipo de relatório a ser gerado</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {reportTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedReport === type.id;
            return (
              <button
                key={type.id}
                onClick={() => onSelect(type.id)}
                className={cn(
                  'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                )}
              >
                <div className={cn('p-2 rounded-lg', isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{type.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{type.description}</p>
                </div>
                {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});
