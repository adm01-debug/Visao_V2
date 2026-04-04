import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Camera, CheckCircle, XCircle, Eye } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface LogsTableProps {
  logs: Tables<'recognition_logs'>[];
  selectedLog: Tables<'recognition_logs'> | null;
  onSelectLog: (log: Tables<'recognition_logs'>) => void;
  getPersonInfo: (id: string | null) => { name: string; photo_url: string | null } | null;
  getCameraName: (id: string | null) => string;
}

export function RecognitionLogsTable({ logs, selectedLog, onSelectLog, getPersonInfo, getCameraName }: LogsTableProps) {
  return (
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
        {logs.map((log) => {
          const person = getPersonInfo(log.person_id);
          return (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                <div className="flex flex-col">
                  <span className="font-medium">{format(new Date(log.timestamp), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  <span className="text-sm text-muted-foreground">{format(new Date(log.timestamp), 'HH:mm:ss', { locale: ptBR })}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {person ? <AvatarImage src={person.photo_url ?? ''} /> : null}
                    <AvatarFallback>{person ? person.name.charAt(0) : '?'}</AvatarFallback>
                  </Avatar>
                  <span className={person ? 'font-medium' : 'text-muted-foreground'}>
                    {person?.name ?? 'Desconhecido'}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-muted-foreground" />
                  {getCameraName(log.camera_id)}
                </div>
              </TableCell>
              <TableCell>
                {log.recognized ? (
                  <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                    <CheckCircle className="h-3 w-3 mr-1" />Reconhecido
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/10 text-amber-500">
                    <XCircle className="h-3 w-3 mr-1" />Desconhecido
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {log.confidence ? (
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Number(log.confidence) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium">{(Number(log.confidence) * 100).toFixed(0)}%</span>
                  </div>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => onSelectLog(log)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Detalhes do Reconhecimento</DialogTitle></DialogHeader>
                    {selectedLog && (
                      <div className="space-y-4">
                        {selectedLog.image_url && (
                          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                            <img src={selectedLog.image_url} alt="Captura" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Data/Hora</p>
                            <p className="font-medium">{format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Câmera</p>
                            <p className="font-medium">{getCameraName(selectedLog.camera_id)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Pessoa</p>
                            <p className="font-medium">{getPersonInfo(selectedLog.person_id)?.name ?? 'Desconhecido'}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Confiança</p>
                            <p className="font-medium">{selectedLog.confidence ? `${(Number(selectedLog.confidence) * 100).toFixed(1)}%` : '-'}</p>
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
  );
}
