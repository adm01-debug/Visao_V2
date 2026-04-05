/**
 * VISÃO - Recognition Analytics Stats Cards
 */
import { Card, CardContent } from '@/components/ui/card';
import { Users, UserCheck, UserX, AlertTriangle } from 'lucide-react';

interface RecognitionStatsCardsProps {
  total: number;
  recognized: number;
  unknown: number;
  blacklist: number;
}

export function RecognitionStatsCards({ total, recognized, unknown, blacklist }: RecognitionStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card><CardContent className="p-4"><div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
        <div><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold">{total}</p></div>
      </div></CardContent></Card>
      <Card><CardContent className="p-4"><div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-success/10"><UserCheck className="h-5 w-5 text-success" /></div>
        <div><p className="text-sm text-muted-foreground">Reconhecidos</p><p className="text-2xl font-bold text-success">{recognized}</p></div>
      </div></CardContent></Card>
      <Card><CardContent className="p-4"><div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-muted"><UserX className="h-5 w-5 text-muted-foreground" /></div>
        <div><p className="text-sm text-muted-foreground">Desconhecidos</p><p className="text-2xl font-bold">{unknown}</p></div>
      </div></CardContent></Card>
      <Card><CardContent className="p-4"><div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
        <div><p className="text-sm text-muted-foreground">Blacklist</p><p className="text-2xl font-bold text-destructive">{blacklist}</p></div>
      </div></CardContent></Card>
    </div>
  );
}
