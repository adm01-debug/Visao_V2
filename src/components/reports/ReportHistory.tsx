import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GeneratedReport {
  id: string;
  date: Date;
  type: string;
}

interface ReportHistoryProps {
  reports: GeneratedReport[];
}

export const ReportHistory = memo(function ReportHistory({ reports }: ReportHistoryProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Histórico Recente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reports.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum relatório gerado</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{report.type}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(report.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  PDF
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});
