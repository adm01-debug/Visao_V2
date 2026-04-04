import { useState, useMemo } from 'react';
import { Search, Clock, User } from 'lucide-react';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { AuditLog } from './SecurityTypes';
import { logLevelConfig, categoryConfig } from './SecurityTypes';

interface AuditLogTableProps {
  logs: AuditLog[];
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!log.action.toLowerCase().includes(q) && !log.description.toLowerCase().includes(q) && !log.userName?.toLowerCase().includes(q)) return false;
      }
      if (levelFilter !== 'all' && log.level !== levelFilter) return false;
      if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
      return true;
    });
  }, [logs, searchQuery, levelFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar logs..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Nível" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos níveis</SelectItem>
            {Object.entries(logLevelConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {Object.entries(categoryConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Nível</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Usuário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum log encontrado</TableCell>
              </TableRow>
            ) : (
              filteredLogs.map(log => {
                const lc = logLevelConfig[log.level];
                const cc = categoryConfig[log.category];
                const LevelIcon = lc.icon;
                const CatIcon = cc.icon;
                return (
                  <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedLog(log)}>
                    <TableCell className="w-[180px]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs">{format(new Date(log.timestamp), "dd/MM HH:mm:ss")}</span>
                      </div>
                    </TableCell>
                    <TableCell className="w-[100px]">
                      <Badge variant="outline" className={cn('text-xs', lc.color)}>
                        <LevelIcon className="w-3 h-3 mr-1" />{lc.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="w-[120px]">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><CatIcon className="w-3 h-3" />{cc.label}</div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{log.action}</TableCell>
                    <TableCell className="max-w-[300px]"><p className="text-sm text-muted-foreground truncate">{log.description}</p></TableCell>
                    <TableCell className="w-[100px]">
                      {log.userName && <div className="flex items-center gap-1 text-xs"><User className="w-3 h-3" />{log.userName}</div>}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes do Log</DialogTitle></DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><Label className="text-muted-foreground">Data/Hora</Label><p>{format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss")}</p></div>
                <div><Label className="text-muted-foreground">Nível</Label><Badge className={logLevelConfig[selectedLog.level].color}>{logLevelConfig[selectedLog.level].label}</Badge></div>
                <div><Label className="text-muted-foreground">Categoria</Label><p>{categoryConfig[selectedLog.category].label}</p></div>
                <div><Label className="text-muted-foreground">Ação</Label><p>{selectedLog.action}</p></div>
              </div>
              <div><Label className="text-muted-foreground">Descrição</Label><p className="text-sm">{selectedLog.description}</p></div>
              {selectedLog.userName && <div><Label className="text-muted-foreground">Usuário</Label><p className="text-sm">{selectedLog.userName}</p></div>}
              {selectedLog.ipAddress && <div><Label className="text-muted-foreground">IP</Label><p className="text-sm font-mono">{selectedLog.ipAddress}</p></div>}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
