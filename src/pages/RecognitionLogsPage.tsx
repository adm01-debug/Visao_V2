import { useState } from 'react';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Search, Camera, User, Filter, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { ExportMenu } from '@/components/ExportMenu';
import { PaginationControls } from '@/components/PaginationControls';
import { useRecognitionData, useFilteredLogs, useRecognitionExport } from '@/components/recognition-logs/useRecognitionData';
import { RecognitionStatsCards } from '@/components/recognition-logs/RecognitionStatsCards';
import { RecognitionLogsTable } from '@/components/recognition-logs/RecognitionLogsTable';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { useManagedFilters } from '@/hooks/useManagedFilters';

const ITEMS_PER_PAGE = 20;

interface RecognitionFilters {
  searchTerm: string;
  selectedPerson: string;
  selectedCamera: string;
  selectedStatus: string;
  dateFrom: string | null;
  dateTo: string | null;
  [key: string]: unknown;
}

const defaultFilters: RecognitionFilters = {
  searchTerm: '',
  selectedPerson: 'all',
  selectedCamera: 'all',
  selectedStatus: 'all',
  dateFrom: null,
  dateTo: null,
};

export default function RecognitionLogsPage() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useManagedFilters<RecognitionFilters>({
    scope: 'recognition-logs',
    defaults: defaultFilters,
    labels: {
      searchTerm: 'busca',
      selectedPerson: 'pessoa',
      selectedCamera: 'câmera',
      selectedStatus: 'status',
      dateFrom: 'data inicial',
      dateTo: 'data final',
    },
  });

  const searchTerm = filters.searchTerm;
  const selectedPerson = filters.selectedPerson;
  const selectedCamera = filters.selectedCamera;
  const selectedStatus = filters.selectedStatus;
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : undefined;

  const setSearchTerm = (v: string) => setFilters((p) => ({ ...p, searchTerm: v }));
  const setSelectedPerson = (v: string) => setFilters((p) => ({ ...p, selectedPerson: v }));
  const setSelectedCamera = (v: string) => setFilters((p) => ({ ...p, selectedCamera: v }));
  const setSelectedStatus = (v: string) => setFilters((p) => ({ ...p, selectedStatus: v }));
  const setDateFrom = (d: Date | undefined) => setFilters((p) => ({ ...p, dateFrom: d ? d.toISOString() : null }));
  const setDateTo = (d: Date | undefined) => setFilters((p) => ({ ...p, dateTo: d ? d.toISOString() : null }));

  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<Tables<'recognition_logs'> | null>(null);

  const { logs, logsLoading, persons, cameras, getPersonInfo, getCameraName } = useRecognitionData();
  const { filteredLogs, stats } = useFilteredLogs(logs, persons, cameras, {
    searchTerm, selectedPerson, selectedCamera, selectedStatus, dateFrom, dateTo
  });
  const { handleExportCSV, handleExportPDF } = useRecognitionExport(filteredLogs, getPersonInfo, getCameraName);

  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);


  return (
    <div role="main" aria-label="Logs de reconhecimento" className="min-h-screen bg-background mb-mobile-nav">
      <PageMeta title="Logs de Reconhecimento" description="Histórico de reconhecimentos faciais" />
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Logs de Reconhecimento</h1>
            <p className="text-muted-foreground">Histórico completo de detecções faciais</p>
          </div>
          <ExportMenu onExportCSV={handleExportCSV} onExportPDF={handleExportPDF} disabled={filteredLogs.length === 0} />
        </div>

        <RecognitionStatsCards {...stats} />

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar pessoa ou câmera..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <Select value={selectedPerson} onValueChange={setSelectedPerson}>
                <SelectTrigger><User className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Pessoa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as pessoas</SelectItem>
                  {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                <SelectTrigger><Camera className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Câmera" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as câmeras</SelectItem>
                  {cameras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="recognized">Reconhecidos</SelectItem>
                  <SelectItem value="unknown">Desconhecidos</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal">
                    <Calendar className="h-4 w-4 mr-2" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yy', { locale: ptBR }) : 'De'}
                    {dateTo ? ` - ${format(dateTo, 'dd/MM/yy', { locale: ptBR })}` : ''}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="flex">
                    <div className="border-r">
                      <p className="p-2 text-sm font-medium text-center">De</p>
                      <CalendarComponent mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} />
                    </div>
                    <div>
                      <p className="p-2 text-sm font-medium text-center">Até</p>
                      <CalendarComponent mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} />
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && <Badge variant="secondary">Busca: {searchTerm}</Badge>}
                  {selectedPerson !== 'all' && <Badge variant="secondary">Pessoa: {persons.find(p => p.id === selectedPerson)?.name}</Badge>}
                  {selectedCamera !== 'all' && <Badge variant="secondary">Câmera: {cameras.find(c => c.id === selectedCamera)?.name}</Badge>}
                  {selectedStatus !== 'all' && <Badge variant="secondary">Status: {selectedStatus === 'recognized' ? 'Reconhecidos' : 'Desconhecidos'}</Badge>}
                  {(dateFrom || dateTo) && <Badge variant="secondary">Período: {dateFrom ? format(dateFrom, 'dd/MM', { locale: ptBR }) : '...'} - {dateTo ? format(dateTo, 'dd/MM', { locale: ptBR }) : '...'}</Badge>}
                </div>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="p-6 space-y-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Nenhum registro encontrado</h3>
                <p className="text-muted-foreground">{logs.length === 0 ? 'Ainda não há logs de reconhecimento facial.' : 'Tente ajustar os filtros.'}</p>
              </div>
            ) : (
              <>
                <RecognitionLogsTable logs={paginatedLogs} selectedLog={selectedLog} onSelectLog={setSelectedLog}
                  getPersonInfo={getPersonInfo} getCameraName={getCameraName} />
                {totalPages > 1 && (
                  <div className="p-4 border-t">
                    <PaginationControls currentPage={currentPage} totalPages={totalPages}
                      totalItems={filteredLogs.length} itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
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
