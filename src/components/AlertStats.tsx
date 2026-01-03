/**
 * VISÃO - Sistema de Vigilância Inteligente
 * AlertStats Component
 */

import { memo, useMemo } from 'react';
import { 
  AlertTriangle, 
  Shield, 
  TrendingUp,
  TrendingDown,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'security' | 'safety' | 'operations' | 'access' | 'analytics';

export interface AlertStatsData {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  isRead: boolean;
  timestamp: Date | string;
}

interface AlertStatsProps {
  alerts: AlertStatsData[];
  previousPeriodAlerts?: AlertStatsData[];
  className?: string;
}

interface StatItemProps {
  label: string;
  value: number;
  total?: number;
  trend?: number;
  color?: string;
}

function StatItem({ label, value, total, trend, color = 'bg-primary' }: StatItemProps) {
  const percentage = total ? Math.round((value / total) * 100) : 0;
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{value}</span>
          {trend !== undefined && (
            <span className={cn(
              "flex items-center text-xs",
              trend > 0 ? "text-destructive" : "text-green-500"
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      {total && (
        <Progress value={percentage} className="h-2" indicatorClassName={color} />
      )}
    </div>
  );
}

function AlertStatsComponent({ alerts, previousPeriodAlerts, className }: AlertStatsProps) {
  const stats = useMemo(() => {
    const total = alerts.length;
    const unread = alerts.filter(a => !a.isRead).length;
    
    const bySeverity = {
      low: alerts.filter(a => a.severity === 'low').length,
      medium: alerts.filter(a => a.severity === 'medium').length,
      high: alerts.filter(a => a.severity === 'high').length,
      critical: alerts.filter(a => a.severity === 'critical').length,
    };
    
    const byType = {
      security: alerts.filter(a => a.type === 'security').length,
      safety: alerts.filter(a => a.type === 'safety').length,
      operations: alerts.filter(a => a.type === 'operations').length,
      access: alerts.filter(a => a.type === 'access').length,
      analytics: alerts.filter(a => a.type === 'analytics').length,
    };

    // Calculate trends if previous period data is available
    let totalTrend: number | undefined;
    let criticalTrend: number | undefined;
    
    if (previousPeriodAlerts) {
      const prevTotal = previousPeriodAlerts.length;
      const prevCritical = previousPeriodAlerts.filter(a => a.severity === 'critical').length;
      
      if (prevTotal > 0) {
        totalTrend = Math.round(((total - prevTotal) / prevTotal) * 100);
      }
      if (prevCritical > 0) {
        criticalTrend = Math.round(((bySeverity.critical - prevCritical) / prevCritical) * 100);
      }
    }

    return { total, unread, bySeverity, byType, totalTrend, criticalTrend };
  }, [alerts, previousPeriodAlerts]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Estatísticas de Alertas
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-secondary/50">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{stats.total}</span>
              {stats.totalTrend !== undefined && (
                <span className={cn(
                  "text-xs flex items-center gap-1",
                  stats.totalTrend > 0 ? "text-destructive" : "text-green-500"
                )}>
                  {stats.totalTrend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(stats.totalTrend)}%
                </span>
              )}
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-destructive/10">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Não Lidos</span>
            </div>
            <span className="text-2xl font-bold text-destructive">{stats.unread}</span>
          </div>
        </div>

        {/* By Severity */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Por Severidade</h4>
          <StatItem label="Crítica" value={stats.bySeverity.critical} total={stats.total} trend={stats.criticalTrend} color="bg-destructive" />
          <StatItem label="Alta" value={stats.bySeverity.high} total={stats.total} color="bg-orange-500" />
          <StatItem label="Média" value={stats.bySeverity.medium} total={stats.total} color="bg-warning" />
          <StatItem label="Baixa" value={stats.bySeverity.low} total={stats.total} color="bg-secondary" />
        </div>

        {/* By Type */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Por Tipo</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-secondary/30">
              <span>Segurança</span>
              <span className="font-medium">{stats.byType.security}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-secondary/30">
              <span>Trabalho</span>
              <span className="font-medium">{stats.byType.safety}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-secondary/30">
              <span>Operações</span>
              <span className="font-medium">{stats.byType.operations}</span>
            </div>
            <div className="flex justify-between p-2 rounded bg-secondary/30">
              <span>Acesso</span>
              <span className="font-medium">{stats.byType.access}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export const AlertStats = memo(AlertStatsComponent);
