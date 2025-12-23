/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ALPRDashboard
 * 
 * Dashboard consolidado com métricas de placas detectadas e histórico de veículos
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlateDetections } from '@/hooks/usePlateDetections';
import { 
  Car, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Search,
  Calendar,
  MapPin,
  Activity,
  Eye,
  Shield,
  Timer,
  BarChart3,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ALPRDashboardProps {
  className?: string;
}

export function ALPRDashboard({ className }: ALPRDashboardProps) {
  const { detections, stats, loading } = usePlateDetections();
  const [searchQuery, setSearchQuery] = useState('');
  const [periodFilter, setPeriodFilter] = useState('7d');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Dados para gráficos
  const chartData = useMemo(() => {
    // Detecções por hora (últimas 24h)
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      const hour = (new Date().getHours() - 23 + i + 24) % 24;
      const count = detections.filter(d => {
        const detectionHour = d.timestamp.getHours();
        return detectionHour === hour && isToday(d.timestamp);
      }).length;
      return { hour: `${hour}h`, detecções: count };
    });

    // Detecções por dia (últimos 7 dias)
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const count = detections.filter(d => 
        format(d.timestamp, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      ).length;
      return { 
        dia: format(date, 'EEE', { locale: ptBR }), 
        detecções: count,
        date: format(date, 'dd/MM')
      };
    });

    // Distribuição por status
    const statusData = [
      { name: 'Autorizados', value: detections.filter(d => d.status === 'authorized').length, color: '#22c55e' },
      { name: 'Desconhecidos', value: detections.filter(d => d.status === 'unknown').length, color: '#64748b' },
      { name: 'Não Autorizados', value: detections.filter(d => d.status === 'unauthorized').length, color: '#eab308' },
      { name: 'Blacklist', value: detections.filter(d => d.status === 'blacklist').length, color: '#ef4444' }
    ].filter(s => s.value > 0);

    // Detecções por câmera
    const cameraData = Object.entries(
      detections.reduce((acc, d) => {
        acc[d.camera_name] = (acc[d.camera_name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    ).map(([camera, count]) => ({ camera, count }))
     .sort((a, b) => b.count - a.count)
     .slice(0, 5);

    return { hourlyData, dailyData, statusData, cameraData };
  }, [detections]);

  // Agrupar detecções por placa para histórico de veículos
  const vehicleHistory = useMemo(() => {
    const grouped = detections.reduce((acc, d) => {
      if (!acc[d.plate]) {
        acc[d.plate] = {
          plate: d.plate,
          firstSeen: d.timestamp,
          lastSeen: d.timestamp,
          totalVisits: 0,
          status: d.status,
          camera: d.camera_name,
          vehicleType: d.vehicle_type
        };
      }
      acc[d.plate].totalVisits++;
      if (d.timestamp > acc[d.plate].lastSeen) {
        acc[d.plate].lastSeen = d.timestamp;
      }
      if (d.timestamp < acc[d.plate].firstSeen) {
        acc[d.plate].firstSeen = d.timestamp;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: unknown, b: unknown) => 
      b.lastSeen.getTime() - a.lastSeen.getTime()
    );
  }, [detections]);

  // Filtrar histórico
  const filteredHistory = useMemo(() => {
    return vehicleHistory.filter((v: unknown) => {
      const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           v.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicleHistory, searchQuery, statusFilter]);

  // Status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'authorized':
        return <Badge className="bg-green-500/20 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Autorizado</Badge>;
      case 'blacklist':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Blacklist</Badge>;
      case 'unauthorized':
        return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30"><Shield className="h-3 w-3 mr-1" />Não Autorizado</Badge>;
      default:
        return <Badge variant="outline"><Eye className="h-3 w-3 mr-1" />Desconhecido</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Car className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard ALPR</h1>
            <p className="text-sm text-muted-foreground">Métricas e histórico de veículos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDetections}</p>
                <p className="text-xs text-muted-foreground">Total Detectado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.todayDetections}</p>
                <p className="text-xs text-muted-foreground">Hoje</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Activity className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.uniquePlates}</p>
                <p className="text-xs text-muted-foreground">Veículos Únicos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blacklistAlerts}</p>
                <p className="text-xs text-muted-foreground">Alertas Blacklist</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.authorizedRate.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Taxa Autorização</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <BarChart3 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.avgConfidence.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Confiança Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Detecções por dia */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Detecções por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="dia" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area 
                    type="monotone" 
                    dataKey="detecções" 
                    fill="hsl(var(--primary))" 
                    fillOpacity={0.2}
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição por status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              {chartData.statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData.statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {chartData.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground">Sem dados</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detecções por hora */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Detecções por Hora (Hoje)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="detecções" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detecções por câmera */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Detecções por Câmera
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {chartData.cameraData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.cameraData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                    <YAxis dataKey="camera" type="category" tick={{ fontSize: 11 }} width={120} className="fill-muted-foreground" />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-muted-foreground">Sem dados</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Veículos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Histórico de Veículos
              </CardTitle>
              <CardDescription>
                Registro de todos os veículos detectados
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar placa..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="authorized">Autorizados</SelectItem>
                  <SelectItem value="blacklist">Blacklist</SelectItem>
                  <SelectItem value="unknown">Desconhecidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredHistory.map((vehicle: unknown) => (
                <div 
                  key={vehicle.plate}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <Car className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-lg font-bold tracking-wider">{vehicle.plate}</span>
                        {getStatusBadge(vehicle.status)}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>{vehicle.vehicleType || 'Veículo'}</span>
                        <span>•</span>
                        <span>{vehicle.camera}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <p className="font-medium">{vehicle.totalVisits} {vehicle.totalVisits === 1 ? 'visita' : 'visitas'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Última vez</p>
                        <p className="text-sm font-medium">
                          {isToday(vehicle.lastSeen) 
                            ? format(vehicle.lastSeen, 'HH:mm')
                            : isYesterday(vehicle.lastSeen)
                              ? 'Ontem'
                              : format(vehicle.lastSeen, 'dd/MM', { locale: ptBR })
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredHistory.length === 0 && (
                <div className="text-center py-12">
                  <Car className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground">Nenhum veículo encontrado</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
