/**
 * VISÃO - Sistema de Vigilância Inteligente
 * RecognitionDashboard Component
 */

import { memo, useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  AlertTriangle,
  Clock,
  TrendingUp,
  Camera as CameraIcon,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatsCard } from './StatsCard';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RecognitionEvent {
  id: string;
  personId?: string;
  personName?: string;
  recognized: boolean;
  confidence: number;
  cameraId: string;
  cameraName: string;
  timestamp: Date | string;
  imageUrl?: string;
}

export interface RecognitionStats {
  totalDetections: number;
  recognizedCount: number;
  unknownCount: number;
  alertCount: number;
  averageConfidence: number;
}

interface RecognitionDashboardProps {
  events: RecognitionEvent[];
  stats?: RecognitionStats;
  onEventClick?: (event: RecognitionEvent) => void;
  className?: string;
}

function RecognitionDashboardComponent({
  events,
  stats,
  onEventClick,
  className
}: RecognitionDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'recognized' | 'unknown'>('all');

  const calculatedStats = useMemo(() => {
    if (stats) return stats;
    
    const totalDetections = events.length;
    const recognizedCount = events.filter(e => e.recognized).length;
    const unknownCount = totalDetections - recognizedCount;
    const alertCount = events.filter(e => !e.recognized && e.confidence > 0.5).length;
    const avgConfidence = events.length > 0
      ? events.reduce((sum, e) => sum + e.confidence, 0) / events.length
      : 0;
    
    return {
      totalDetections,
      recognizedCount,
      unknownCount,
      alertCount,
      averageConfidence: Math.round(avgConfidence * 100),
    };
  }, [events, stats]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const matchesSearch = 
        (event.personName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        event.cameraName.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterStatus === 'all' ||
        (filterStatus === 'recognized' && event.recognized) ||
        (filterStatus === 'unknown' && !event.recognized);
      
      return matchesSearch && matchesFilter;
    });
  }, [events, searchQuery, filterStatus]);

  const recentEvents = filteredEvents.slice(0, 20);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total Detecções"
          value={calculatedStats.totalDetections}
          icon={Users}
        />
        <StatsCard
          title="Reconhecidos"
          value={calculatedStats.recognizedCount}
          icon={UserCheck}
          trend={{ value: Math.round((calculatedStats.recognizedCount / Math.max(calculatedStats.totalDetections, 1)) * 100), isPositive: true }}
        />
        <StatsCard
          title="Desconhecidos"
          value={calculatedStats.unknownCount}
          icon={UserX}
          variant={calculatedStats.unknownCount > 10 ? 'warning' : 'default'}
        />
        <StatsCard
          title="Alertas"
          value={calculatedStats.alertCount}
          icon={AlertTriangle}
          variant={calculatedStats.alertCount > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Events Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Eventos Recentes
            </CardTitle>
            
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-36">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recognized">Reconhecidos</SelectItem>
                  <SelectItem value="unknown">Desconhecidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map((event) => {
                const timestamp = event.timestamp instanceof Date 
                  ? event.timestamp 
                  : new Date(event.timestamp);
                
                return (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      "flex items-center gap-4 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent",
                      !event.recognized && "border-l-4 border-l-warning"
                    )}
                  >
                    {/* Avatar/Image */}
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
                      {event.imageUrl ? (
                        <img src={event.imageUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {event.recognized ? event.personName : 'Pessoa Desconhecida'}
                        </span>
                        <Badge variant={event.recognized ? 'secondary' : 'warning'}>
                          {event.recognized ? 'Reconhecido' : 'Desconhecido'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <CameraIcon className="w-3 h-3" />
                          {event.cameraName}
                        </span>
                        <span>{Math.round(event.confidence * 100)}% confiança</span>
                      </div>
                    </div>
                    
                    {/* Timestamp */}
                    <div className="text-sm text-muted-foreground text-right flex-shrink-0">
                      <div>{format(timestamp, 'HH:mm', { locale: ptBR })}</div>
                      <div className="text-xs">
                        {formatDistanceToNow(timestamp, { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export const RecognitionDashboard = memo(RecognitionDashboardComponent);
