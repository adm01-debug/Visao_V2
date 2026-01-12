import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReportCardProps {
  title: string;
  description?: string;
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  generatedAt?: Date;
  onView?: () => void;
  onDownload?: () => void;
  className?: string;
}

const typeLabels = { daily: 'Diário', weekly: 'Semanal', monthly: 'Mensal', custom: 'Personalizado' };

export function ReportCard({ title, description, type, generatedAt, onView, onDownload, className }: ReportCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><FileText className="h-5 w-5 text-primary" /></div>
        <div className="flex-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 bg-muted rounded">{typeLabels[type]}</span>
            {generatedAt && (
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{generatedAt.toLocaleDateString('pt-BR')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        {onView && <Button size="sm" variant="outline" onClick={onView}><Eye className="h-4 w-4 mr-1" />Ver</Button>}
        {onDownload && <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-4 w-4 mr-1" />Baixar</Button>}
      </div>
    </div>
  );
}

export default ReportCard;
