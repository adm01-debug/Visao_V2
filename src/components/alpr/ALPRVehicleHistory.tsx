import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Car, Search, Timer, CheckCircle2, AlertTriangle, Shield, Eye } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VehicleEntry {
  plate: string;
  firstSeen: string;
  lastSeen: string;
  totalVisits: number;
  status: string;
  camera: string;
  vehicleType: string | null;
}

interface ALPRVehicleHistoryProps {
  vehicleHistory: VehicleEntry[];
}

function getStatusBadge(status: string) {
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
}

export function ALPRVehicleHistory({ vehicleHistory }: ALPRVehicleHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredHistory = useMemo(() => {
    return vehicleHistory.filter((v) => {
      const matchesSearch = v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vehicleType?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [vehicleHistory, searchQuery, statusFilter]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Histórico de Veículos
            </CardTitle>
            <CardDescription>Registro de todos os veículos detectados</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar placa..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 w-48" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
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
            {filteredHistory.map((vehicle) => (
              <div key={vehicle.plate} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
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
                        {isToday(vehicle.lastSeen) ? format(vehicle.lastSeen, 'HH:mm')
                          : isYesterday(vehicle.lastSeen) ? 'Ontem'
                            : format(vehicle.lastSeen, 'dd/MM', { locale: ptBR })}
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
  );
}
