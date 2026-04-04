/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: AnalyticsComparison - Comparação de métricas entre períodos
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, ArrowDownRight, Minus, TrendingUp, TrendingDown,
  Users, Car, AlertTriangle, Camera, Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MetricData {
  label: string;
  current: number;
  previous: number;
  icon: React.ReactNode;
}

interface AnalyticsComparisonProps {
  cameraId?: string;
}

export function AnalyticsComparison({ cameraId }: AnalyticsComparisonProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    
    const now = new Date();
    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
      case 'day':
        currentStart = startOfDay(now);
        previousStart = startOfDay(subDays(now, 1));
        previousEnd = endOfDay(subDays(now, 1));
        break;
      case 'week':
        currentStart = startOfDay(subDays(now, 7));
        previousStart = startOfDay(subDays(now, 14));
        previousEnd = endOfDay(subDays(now, 8));
        break;
      case 'month':
        currentStart = startOfDay(subMonths(now, 1));
        previousStart = startOfDay(subMonths(now, 2));
        previousEnd = endOfDay(subMonths(now, 1));
        break;
    }

    try {
      // Fetch alerts count
      const { count: currentAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', currentStart.toISOString())
        .lte('created_at', now.toISOString());

      const { count: previousAlerts } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', previousStart.toISOString())
        .lte('created_at', previousEnd.toISOString());

      // Fetch face detections
      const { count: currentFaces } = await supabase
        .from('recognition_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', currentStart.toISOString())
        .lte('timestamp', now.toISOString());

      const { count: previousFaces } = await supabase
        .from('recognition_logs')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', previousStart.toISOString())
        .lte('timestamp', previousEnd.toISOString());

      // Fetch plate detections
      const { count: currentPlates } = await supabase
        .from('plate_detections')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', currentStart.toISOString())
        .lte('timestamp', now.toISOString());

      const { count: previousPlates } = await supabase
        .from('plate_detections')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', previousStart.toISOString())
        .lte('timestamp', previousEnd.toISOString());

      setMetrics([
        {
          label: 'Alertas',
          current: currentAlerts || 0,
          previous: previousAlerts || 0,
          icon: <AlertTriangle className="h-4 w-4" />
        },
        {
          label: 'Faces Detectadas',
          current: currentFaces || 0,
          previous: previousFaces || 0,
          icon: <Users className="h-4 w-4" />
        },
        {
          label: 'Placas Lidas',
          current: currentPlates || 0,
          previous: previousPlates || 0,
          icon: <Car className="h-4 w-4" />
        }
      ]);
    } catch (error) {
      // Error handled silently - metrics fetch failed
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [period, cameraId]);

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUpRight className="h-4 w-4 text-green-500" />;
    if (change < 0) return <ArrowDownRight className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getChangeBadge = (change: number) => {
    const absChange = Math.abs(change).toFixed(1);
    if (change > 0) {
      return <Badge className="bg-green-500">+{absChange}%</Badge>;
    }
    if (change < 0) {
      return <Badge variant="destructive">-{absChange}%</Badge>;
    }
    return <Badge variant="secondary">0%</Badge>;
  };

  const getPeriodLabel = () => {
    switch (period) {
      case 'day': return 'vs. ontem';
      case 'week': return 'vs. semana passada';
      case 'month': return 'vs. mês passado';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparação de Métricas
            </CardTitle>
            <CardDescription>
              Compare o desempenho entre períodos
            </CardDescription>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as typeof period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoje vs. Ontem</SelectItem>
              <SelectItem value="week">Esta Semana vs. Anterior</SelectItem>
              <SelectItem value="month">Este Mês vs. Anterior</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.map((metric) => {
            const change = calculateChange(metric.current, metric.previous);
            
            return (
              <Card key={metric.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      {metric.icon}
                      <span className="text-sm">{metric.label}</span>
                    </div>
                    {getChangeIcon(change)}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-3xl font-bold">{metric.current.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {getPeriodLabel()}: {metric.previous.toLocaleString()}
                      </p>
                    </div>
                    {getChangeBadge(change)}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
