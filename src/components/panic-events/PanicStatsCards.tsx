/**
 * VISÃO - Panic Events Stats Cards
 */
import { AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface PanicStatsCardsProps {
  unresolvedCount: number;
  totalCount: number;
}

export function PanicStatsCards({ unresolvedCount, totalCount }: PanicStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-destructive/10">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold">{unresolvedCount}</p>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-secondary">
            <CheckCircle2 className="w-6 h-6 text-secondary-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount - unresolvedCount}</p>
            <p className="text-sm text-muted-foreground">Resolvidos</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalCount}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
