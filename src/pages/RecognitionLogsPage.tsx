import { useCopyToClipboard } from "@/hooks";
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Calendar, 
  Camera, 
  User, 
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Percent
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportMenu } from '@/components/ExportMenu';
import { PaginationControls } from '@/components/PaginationControls';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';
import { useI18n } from '@/contexts/i18n';

const ITEMS_PER_PAGE = 20;

export default function RecognitionLogsPage() {
  const { t } = useI18n();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<string>('all');
  const [selectedCamera, setSelectedCamera] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<any>(null);

  // Fetch recognition logs
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['recognition-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recognition_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch registered persons for filter
  const { data: persons } = useQuery({
    queryKey: ['registered-persons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, photo_url')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch cameras for filter
  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cameras')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filter logs
  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return logs.filter(log => {
      // Search filter
      if (searchTerm) {
        const personName = persons?.find(p => p.id === log.person_id)?.name?.toLowerCase() || '';
        const cameraName = cameras?.find(c => c.id === log.camera_id)?.name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        if (!personName.includes(search) && !cameraName.includes(search)) {
          return false;
        }
      }

      // Person filter
      if (selectedPerson !== 'all' && log.person_id !== selectedPerson) {
        return false;
      }

      // Camera filter
      if (selectedCamera !== 'all' && log.camera_id !== selectedCamera) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'recognized' && !log.recognized) return false;
        if (selectedStatus === 'unknown' && log.recognized) return false;
      }

      // Date filters
      const logDate = new Date(log.timestamp);
      if (dateFrom && logDate < dateFrom) return false;
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (logDate > endOfDay) return false;
      }

      return true;
    });
  }, [logs, persons, cameras, searchTerm, selectedPerson, selectedCamera, selectedStatus, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    if (!filteredLogs.length) return { total: 0, recognized: 0, unknown: 0, avgConfidence: 0 };
    
    const recognized = filteredLogs.filter(l => l.recognized).length;
    const avgConfidence = filteredLogs
      .filter(l => l.confidence)
      .reduce((sum, l) => sum + Number(l.confidence), 0) / filteredLogs.filter(l => l.confidence).length || 0;

    return {
      total: filteredLogs.length,
      recognized,
      unknown: filteredLogs.length - recognized,
      avgConfidence: avgConfidence * 100
    };
  }, [filteredLogs]);

  // Get person/camera info helpers
  const getPersonInfo = (personId: string | null) => {
    if (!personId) return null;
    return persons?.find(p => p.id === personId);
  };

  const getCameraName = (cameraId: string | null) => {
    if (!cameraId) return 'Desconhecida';
    return cameras?.find(c => c.id === cameraId)?.name || 'Desconhecida';
  };

  // Export handlers
  const handleExportCSV = () => {
    const data = filteredLogs.map(log => ({
      'Data/Hora': format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      'Pessoa': getPersonInfo(log.person_id)?.name || 'Desconhecido',
      'Câmera': getCameraName(log.camera_id),
      'Reconhecido': log.recognized ? 'Sim' : 'Não',
      'Confiança': log.confidence ? `${(Number(log.confidence) * 100).toFixed(1)}%` : '-'
    }));
    exportToCSV(data, 'logs-reconhecimento');
  };

  const handleExportPDF = () => {
    const data = filteredLogs.map(log => ({
      'Data/Hora': format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      'Pessoa': getPersonInfo(log.person_id)?.name || 'Desconhecido',
      'Câmera': getCameraName(log.camera_id),
      'Reconhecido': log.recognized ? 'Sim' : 'Não',
      'Confiança': log.confidence ? `${(Number(log.confidence) * 100).toFixed(1)}%` : '-'
    }));
    exportToPDF(data, 'logs-reconhecimento', 'Logs de Reconhecimento Facial');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPerson('all');
    setSelectedCamera('all');
    setSelectedStatus('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6">
        {/* Header */}
        <div role="main" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs de Reconhecimento</h1>
            <p className="text-muted-foreground">Histórico completo de detecções faciais</p>
          </div>
          <ExportMenu 
            onExportCSV={handleExportCSV} 
            onExportPDF={handleExportPDF}
            disabled={filteredLogs.length === 0}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div role="main" className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div role="main" className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reconhecidos</p>
                  <p className="text-2xl font-bold text-green-500">{stats.recognized}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div role="main" className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desconhecidos</p>
                  <p className="text-2xl font-bold text-amber-500">{stats.unknown}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div role="main" className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Percent className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Confiança Média</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.avgConfidence.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar pessoa ou câmera..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Person Filter */}
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger>
                  <User className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Pessoa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as pessoas</SelectItem>
                  {persons?.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Camera Filter */}
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger>
                  <Camera className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Câmera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as câmeras</SelectItem>
                  {cameras?.map(camera => (
                    <SelectItem key={camera.id} value={camera.id}>
                      {camera.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recognized">Reconhecidos</SelectItem>
                  <SelectItem value="unknown">Desconhecidos</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yy', { locale: ptBR }) : 'De'}
                    {dateTo ? ` - ${format(dateTo, 'dd/MM/yy', { locale: ptBR })}` : ''}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div role="main" className="flex">
                    <div className="border-r">
                      <p className="p-2 text-sm font-medium text-center">De</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateFrom}
                        onSelect={setDateFrom}
                        locale={ptBR}
                      />
                    </div>
                    <div>
                      <p className="p-2 text-sm font-medium text-center">Até</p>
                      <CalendarComponent
                        mode="single"
                        selected={dateTo}
                        onSelect={setDateTo}
                        locale={ptBR}
                      />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Active Filters */}
            {(searchTerm || selectedPerson !== 'all' || selectedCamera !== 'all' || selectedStatus !== 'all' || dateFrom || dateTo) && (
              <div role="main" className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                <div role="main" className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <Badge variant="secondary">Busca: {searchTerm}</Badge>
                  )}
                  {selectedPerson !== 'all' && (
                    <Badge variant="secondary">
                      Pessoa: {persons?.find(p => p.id === selectedPerson)?.name}
                    </Badge>
                  )}
                  {selectedCamera !== 'all' && (
                    <Badge variant="secondary">
                      Câmera: {cameras?.find(c => c.id === selectedCamera)?.name}
                    </Badge>
                  )}
                  {selectedStatus !== 'all' && (
                    <Badge variant="secondary">
                      Status: {selectedStatus === 'recognized' ? 'Reconhecidos' : 'Desconhecidos'}
                    </Badge>
                  )}
                  {(dateFrom || dateTo) && (
                    <Badge variant="secondary">
                      Período: {dateFrom ? format(dateFrom, 'dd/MM', { locale: ptBR }) : '...'} - {dateTo ? format(dateTo, 'dd/MM', { locale: ptBR }) : '...'}
                    </Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Limpar
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Logs Table */}
        <Card>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">
                  {logs?.length === 0 
                    ? 'Ainda não há logs de reconhecimento facial.' 
                    : 'Tente ajustar os filtros para encontrar registros.'}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Pessoa</TableHead>
                      <TableHead>Câmera</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead className="w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedLogs.map((log) => {
                      const person = getPersonInfo(log.person_id);
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="whitespace-nowrap">
                            <div role="main" className="flex flex-col">
                              <span className="font-medium">
                                {format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {format(new Date(log.timestamp), 'HH:mm:ss', { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {person ? (
                              <div role="main" className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={person.photo_url || ''} />
                                  <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{person.name}</span>
                              </div>
                            ) : (
                              <div role="main" className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>?</AvatarFallback>
                                </Avatar>
                                <span className="text-muted-foreground">Desconhecido</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div role="main" className="flex items-center gap-2">
                              <Camera className="h-4 w-4 text-muted-foreground" />
                              {getCameraName(log.camera_id)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {log.recognized ? (
                              <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Reconhecido
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                                <XCircle className="h-3 w-3 mr-1" />
                                Desconhecido
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {log.confidence ? (
                              <div role="main" className="flex items-center gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-primary rounded-full"
                                    style={{ width: `${Number(log.confidence) * 100}%` }}
                                  />
                                </div>
                                <span className="text-sm font-medium">
                                  {(Number(log.confidence) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => setSelectedLog(log)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Detalhes do Reconhecimento</DialogTitle>
                                </DialogHeader>
                                {selectedLog && (
                                  <div className="space-y-4">
                                    {selectedLog.image_url && (
                                      <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                                        <img 
                                          src={selectedLog.image_url} 
                                          alt="Captura" 
                                          className="w-full h-full object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <p className="text-sm text-muted-foreground">Data/Hora</p>
                                        <p className="font-medium">
                                          {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Câmera</p>
                                        <p className="font-medium">{getCameraName(selectedLog.camera_id)}</p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Pessoa</p>
                                        <p className="font-medium">
                                          {getPersonInfo(selectedLog.person_id)?.name || 'Desconhecido'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm text-muted-foreground">Confiança</p>
                                        <p className="font-medium">
                                          {selectedLog.confidence 
                                            ? `${(Number(selectedLog.confidence) * 100).toFixed(1)}%` 
                                            : '-'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t">
                    <PaginationControls
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={filteredLogs.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
