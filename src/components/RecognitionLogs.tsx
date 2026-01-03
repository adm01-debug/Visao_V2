/**
 * VISÃO - Sistema de Vigilância Inteligente
 * RecognitionLogs Component
 */

import { memo, useState, useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  Camera as CameraIcon,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface RecognitionLog {
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

interface RecognitionLogsProps {
  logs: RecognitionLog[];
  onLogClick?: (log: RecognitionLog) => void;
  onExport?: () => void;
  itemsPerPage?: number;
  className?: string;
}

function RecognitionLogsComponent({
  logs,
  onLogClick,
  onExport,
  itemsPerPage = 15,
  className
}: RecognitionLogsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => 
      (log.personName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      log.cameraName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [logs, searchQuery]);

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-500';
    if (confidence >= 0.7) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Logs de Reconhecimento
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
            
            {onExport && (
              <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {paginatedLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum log encontrado</p>
          </div>
        ) : (
          <>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Pessoa</TableHead>
                    <TableHead>Câmera</TableHead>
                    <TableHead>Confiança</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLogs.map((log) => {
                    const timestamp = log.timestamp instanceof Date 
                      ? log.timestamp 
                      : new Date(log.timestamp);
                    
                    return (
                      <TableRow 
                        key={log.id}
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => onLogClick?.(log)}
                      >
                        <TableCell>
                          {log.recognized ? (
                            <Badge variant="secondary" className="gap-1">
                              <UserCheck className="w-3 h-3" />
                              Reconhecido
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <UserX className="w-3 h-3" />
                              Desconhecido
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {log.personName || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1">
                            <CameraIcon className="w-3 h-3" />
                            {log.cameraName}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={getConfidenceColor(log.confidence)}>
                            {Math.round(log.confidence * 100)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {format(timestamp, "dd/MM/yy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} de {filteredLogs.length}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm">{currentPage} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export const RecognitionLogs = memo(RecognitionLogsComponent);
