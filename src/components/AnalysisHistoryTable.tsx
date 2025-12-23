import { useCopyToClipboard } from "@/hooks";
import { memo } from "react";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: AnalysisHistoryTable
 * 
 * Tabela detalhada do histórico de análises com:
 * - Filtros por câmera, tipo, data
 * - Ordenação por colunas
 * - Paginação
 * - Exportação
 * - Visualização de detalhes
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Filter,
  Download,
  Eye,
  Search,
  RefreshCw,
  Calendar,
  Target,
  Brain,
  Activity,
  ScanFace,
  Users,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface AnalysisRecord {
  id: string;
  camera_id: string;
  camera_name: string;
  analysis_type: string;
  result: 'success' | 'warning' | 'error' | 'info';
  confidence: number;
  detections: {
    type: string;
    count: number;
    details?: string;
  }[];
  alerts_generated: number;
  duration_ms: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface AnalysisHistoryTableProps {
  className?: string;
  limit?: number;
  cameraId?: string;
  onRowClick?: (record: AnalysisRecord) => void;
}

type SortField = 'timestamp' | 'camera_name' | 'analysis_type' | 'confidence' | 'alerts_generated';
type SortDirection = 'asc' | 'desc';

// ============================================
// CONSTANTES
// ============================================

const analysisTypeLabels: Record<string, { label: string; icon: unknown; color: string }> = {
  security: { label: 'Segurança', icon: AlertTriangle, color: 'text-red-500' },
  people: { label: 'Pessoas', icon: Users, color: 'text-blue-500' },
  vehicle: { label: 'Veículos', icon: Target, color: 'text-green-500' },
  face: { label: 'Facial', icon: ScanFace, color: 'text-purple-500' },
  motion: { label: 'Movimento', icon: Activity, color: 'text-orange-500' },
  general: { label: 'Geral', icon: Brain, color: 'text-gray-500' },
};

const resultConfig: Record<string, { label: string; icon: unknown; color: string }> = {
  success: { label: 'Sucesso', icon: CheckCircle, color: 'text-green-500' },
  warning: { label: 'Atenção', icon: AlertTriangle, color: 'text-yellow-500' },
  error: { label: 'Erro', icon: XCircle, color: 'text-red-500' },
  info: { label: 'Info', icon: Info, color: 'text-blue-500' },
};

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function AnalysisHistoryTable({
  className,
  limit = 50,
  cameraId,
  onRowClick,
}: AnalysisHistoryTableProps) {
  const [records, setRecords] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filtros
  const [search, setSearch] = useState('');
  const [filterCamera, setFilterCamera] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  // Ordenação
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Paginação
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal de detalhes
  const [selectedRecord, setSelectedRecord] = useState<AnalysisRecord | null>(null);

  // Lista de câmeras para filtro
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);

  // Carregar câmeras
  useEffect(() => {
    const loadCameras = async () => {
      const { data } = await supabase
        .from('cameras')
        .select('id, name')
        .order('name');
      if (data) setCameras(data);
    };
    loadCameras();
  }, []);

  // Carregar dados
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('analysis_history')
        .select(`
          id,
          camera_id,
          cameras!inner(name),
          analysis_type,
          result,
          confidence,
          detections,
          alerts_generated,
          duration_ms,
          timestamp,
          metadata
        `, { count: 'exact' })
        .gte('timestamp', startOfDay(dateRange.from).toISOString())
        .lte('timestamp', endOfDay(dateRange.to).toISOString());

      // Aplicar filtros
      if (cameraId) {
        query = query.eq('camera_id', cameraId);
      } else if (filterCamera !== 'all') {
        query = query.eq('camera_id', filterCamera);
      }

      if (filterType !== 'all') {
        query = query.eq('analysis_type', filterType);
      }

      if (filterResult !== 'all') {
        query = query.eq('result', filterResult);
      }

      // Ordenação
      query = query.order(sortField, { ascending: sortDirection === 'asc' });

      // Paginação
      const start = (page - 1) * pageSize;
      query = query.range(start, start + pageSize - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Mapear dados
      const mapped: AnalysisRecord[] = (data || []).map((row: unknown) => ({
        id: row.id,
        camera_id: row.camera_id,
        camera_name: row.cameras?.name || 'Câmera desconhecida',
        analysis_type: row.analysis_type,
        result: row.result,
        confidence: row.confidence,
        detections: row.detections || [],
        alerts_generated: row.alerts_generated || 0,
        duration_ms: row.duration_ms || 0,
        timestamp: row.timestamp,
        metadata: row.metadata,
      }));

      // Filtrar por busca
      const filtered = search
        ? mapped.filter(r => 
            r.camera_name.toLowerCase().includes(search.toLowerCase()) ||
            r.analysis_type.toLowerCase().includes(search.toLowerCase())
          )
        : mapped;

      setRecords(filtered);
      setTotalCount(count || 0);
    } catch (error) {
      toast.error('Erro ao carregar histórico de análises');
    } finally {
      setLoading(false);
    }
  }, [cameraId, filterCamera, filterType, filterResult, dateRange, sortField, sortDirection, page, pageSize, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Alternar ordenação
  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(1);
  };

  // Ícone de ordenação
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="w-4 h-4 opacity-50" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  // Exportar CSV
  const exportCSV = () => {
    const headers = ['Data', 'Câmera', 'Tipo', 'Resultado', 'Confiança', 'Alertas', 'Duração'];
    const rows = records.map(r => [
      format(new Date(r.timestamp), 'dd/MM/yyyy HH:mm'),
      r.camera_name,
      analysisTypeLabels[r.analysis_type]?.label || r.analysis_type,
      resultConfig[r.result]?.label || r.result,
      `${(r.confidence * 100).toFixed(1)}%`,
      r.alerts_generated,
      `${r.duration_ms}ms`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('
');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado');
  };

  // Total de páginas
  const totalPages = Math.ceil(totalCount / pageSize);

  // Limpar filtros
  const clearFilters = () => {
    setSearch('');
    setFilterCamera('all');
    setFilterType('all');
    setFilterResult('all');
    setDateRange({ from: subDays(new Date(), 7), to: new Date() });
    setPage(1);
  };

  const hasActiveFilters = search || filterCamera !== 'all' || filterType !== 'all' || filterResult !== 'all';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Barra de ferramentas */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por câmera ou tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          <Select value={filterCamera} onValueChange={(v) => { setFilterCamera(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <Camera className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Câmera" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas câmeras</SelectItem>
              {cameras.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <Brain className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos tipos</SelectItem>
              {Object.entries(analysisTypeLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterResult} onValueChange={(v) => { setFilterResult(v); setPage(1); }}>
            <SelectTrigger className="w-[130px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Resultado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(resultConfig).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date range picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-start">
                <Calendar className="w-4 h-4 mr-2" />
                {format(dateRange.from, 'dd/MM', { locale: ptBR })} - {format(dateRange.to, 'dd/MM', { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setPage(1);
                  }
                }}
                locale={ptBR}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Ações */}
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={exportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {loading ? 'Carregando...' : `${totalCount} registros encontrados`}
        </span>
        <Select 
          value={String(pageSize)} 
          onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
        >
          <SelectTrigger className="w-20 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map(n => (
              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSort('timestamp')}
              >
                <div className="flex items-center gap-1">
                  Data/Hora <SortIcon field="timestamp" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSort('camera_name')}
              >
                <div className="flex items-center gap-1">
                  Câmera <SortIcon field="camera_name" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => toggleSort('analysis_type')}
              >
                <div className="flex items-center gap-1">
                  Tipo <SortIcon field="analysis_type" />
                </div>
              </TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => toggleSort('confidence')}
              >
                <div className="flex items-center justify-end gap-1">
                  Confiança <SortIcon field="confidence" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 text-right"
                onClick={() => toggleSort('alerts_generated')}
              >
                <div className="flex items-center justify-end gap-1">
                  Alertas <SortIcon field="alerts_generated" />
                </div>
              </TableHead>
              <TableHead className="text-right">Duração</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-muted-foreground">Nenhuma análise encontrada</p>
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => {
                const typeInfo = analysisTypeLabels[record.analysis_type] || analysisTypeLabels.general;
                const resultInfo = resultConfig[record.result] || resultConfig.info;
                const TypeIcon = typeInfo.icon;
                const ResultIcon = resultInfo.icon;

                return (
                  <TableRow 
                    key={record.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <TableCell className="font-mono text-sm">
                      {format(new Date(record.timestamp), 'dd/MM HH:mm:ss')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {record.camera_name}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <TypeIcon className={cn('w-4 h-4', typeInfo.color)} />
                        <span>{typeInfo.label}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={cn('gap-1', resultInfo.color)}
                      >
                        <ResultIcon className="w-3 h-3" />
                        {resultInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(record.confidence * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {record.alerts_generated > 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          {record.alerts_generated}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {record.duration_ms}ms
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              Última
            </Button>
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      <Dialog open={!!selectedRecord} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              Detalhes da Análise
            </DialogTitle>
            <DialogDescription>
              {selectedRecord && format(new Date(selectedRecord.timestamp), "dd 'de' MMMM 'às' HH:mm:ss", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedRecord && (
            <div className="space-y-4">
              {/* Info básica */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Câmera</p>
                  <p className="font-medium">{selectedRecord.camera_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Tipo de Análise</p>
                  <p className="font-medium">
                    {analysisTypeLabels[selectedRecord.analysis_type]?.label || selectedRecord.analysis_type}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Confiança</p>
                  <p className="font-medium">{(selectedRecord.confidence * 100).toFixed(1)}%</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Duração</p>
                  <p className="font-medium">{selectedRecord.duration_ms}ms</p>
                </div>
              </div>

              {/* Detecções */}
              {selectedRecord.detections.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Detecções</p>
                  <div className="space-y-2">
                    {selectedRecord.detections.map((det, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded bg-muted/30">
                        <span>{det.type}</span>
                        <Badge variant="secondary">{det.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedRecord.metadata && Object.keys(selectedRecord.metadata).length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Metadata</p>
                  <pre className="p-3 rounded bg-muted/30 text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedRecord.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default memo(AnalysisHistoryTable);
