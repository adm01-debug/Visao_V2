/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: RealTimeStats - Estatísticas em tempo real
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, Users, Car, AlertTriangle, Camera, Wifi, 
  TrendingUp, Clock, Zap
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeStat {
  id: string;
  label: string;
  value: number;
  maxValue?: number;
  trend: 'up' | 'down' | 'stable';
  icon: React.ReactNode;
  color: string;
}

export function RealTimeStats() {
  const [stats, setStats] = useState<RealtimeStat[]>([
    {
      id: 'cameras',
      label: 'Câmeras Online',
      value: 0,
      maxValue: 10,
      trend: 'stable',
      icon: <Camera className="h-4 w-4" />,
      color: 'bg-blue-500'
    },
    {
      id: 'alerts',
      label: 'Alertas Hoje',
      value: 0,
      trend: 'stable',
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'bg-red-500'
    },
    {
      id: 'faces',
      label: 'Faces Detectadas',
      value: 0,
      trend: 'stable',
      icon: <Users className="h-4 w-4" />,
      color: 'bg-green-500'
    },
    {
      id: 'plates',
      label: 'Placas Lidas',
      value: 0,
      trend: 'stable',
      icon: <Car className="h-4 w-4" />,
      color: 'bg-amber-500'
    }
  ]);
  
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isConnected, setIsConnected] = useState(true);

  const fetchInitialStats = useCallback(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Cameras online
      const { count: camerasCount } = await supabase
        .from('cameras')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online');

      // Alerts today
      const { count: alertsCount } = await supabase
        .from('alerts')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Faces today
      const { count: facesCount } = await supabase
        .from('face_detections')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString());

      // Plates today
      const { count: platesCount } = await supabase
        .from('plate_detections')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', today.toISOString());

      setStats(prev => prev.map(stat => {
        switch (stat.id) {
          case 'cameras':
            return { ...stat, value: camerasCount || 0 };
          case 'alerts':
            return { ...stat, value: alertsCount || 0 };
          case 'faces':
            return { ...stat, value: facesCount || 0 };
          case 'plates':
            return { ...stat, value: platesCount || 0 };
          default:
            return stat;
        }
      }));
      
      setLastUpdate(new Date());
    } catch (error) {
      // Stats fetch error handled silently
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialStats();

    // Subscribe to realtime changes
    const alertsChannel = supabase
      .channel('realtime-alerts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alerts' }, () => {
        setStats(prev => prev.map(stat => 
          stat.id === 'alerts' 
            ? { ...stat, value: stat.value + 1, trend: 'up' as const }
            : stat
        ));
        setLastUpdate(new Date());
      })
      .subscribe();

    const facesChannel = supabase
      .channel('realtime-faces')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'face_detections' }, () => {
        setStats(prev => prev.map(stat => 
          stat.id === 'faces' 
            ? { ...stat, value: stat.value + 1, trend: 'up' as const }
            : stat
        ));
        setLastUpdate(new Date());
      })
      .subscribe();

    const platesChannel = supabase
      .channel('realtime-plates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'plate_detections' }, () => {
        setStats(prev => prev.map(stat => 
          stat.id === 'plates' 
            ? { ...stat, value: stat.value + 1, trend: 'up' as const }
            : stat
        ));
        setLastUpdate(new Date());
      })
      .subscribe();

    // Reset trends after 5 seconds
    const trendResetInterval = setInterval(() => {
      setStats(prev => prev.map(stat => ({ ...stat, trend: 'stable' as const })));
    }, 5000);

    return () => {
      supabase.removeChannel(alertsChannel);
      supabase.removeChannel(facesChannel);
      supabase.removeChannel(platesChannel);
      clearInterval(trendResetInterval);
    };
  }, [fetchInitialStats]);

  const getTrendIndicator = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500 animate-bounce" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Estatísticas em Tempo Real
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
            </CardDescription>
          </div>
          <Badge variant={isConnected ? 'default' : 'destructive'} className="gap-1">
            {isConnected ? (
              <>
                <Zap className="h-3 w-3" />
                Ao vivo
              </>
            ) : (
              <>
                <Wifi className="h-3 w-3" />
                Desconectado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div 
              key={stat.id} 
              className={`p-4 rounded-lg border transition-all ${
                stat.trend === 'up' ? 'ring-2 ring-green-500 ring-opacity-50' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-full ${stat.color} text-white`}>
                  {stat.icon}
                </div>
                {getTrendIndicator(stat.trend)}
              </div>
              <p className="text-2xl font-bold">{stat.value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {stat.maxValue && (
                <Progress 
                  value={(stat.value / stat.maxValue) * 100} 
                  className="mt-2 h-1"
                />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
