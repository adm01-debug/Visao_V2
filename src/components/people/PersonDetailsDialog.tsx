import { useState, useEffect } from 'react';
import { Edit, Trash2, ScanFace, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DbPerson, DbRecognitionLog } from './types';

interface PersonDetailsDialogProps {
  person: DbPerson | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PersonDetailsDialog({ person, isOpen, onClose, onEdit, onDelete }: PersonDetailsDialogProps) {
  const [recognitionLogs, setRecognitionLogs] = useState<DbRecognitionLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (person && isOpen) {
      setLoadingLogs(true);
      const load = async () => {
        try {
          const { data } = await supabase
            .from('recognition_logs')
            .select('*')
            .eq('person_id', person.id)
            .order('created_at', { ascending: false })
            .limit(50);
          setRecognitionLogs(data || []);
        } finally {
          setLoadingLogs(false);
        }
      };
      void load();
    }
  }, [person, isOpen]);

  if (!person) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={person.photo_url || undefined} />
              <AvatarFallback>{person.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <span>{person.name}</span>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={person.is_active ? 'default' : 'secondary'} className="text-xs">
                  {person.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="history">Histórico ({recognitionLogs.length})</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <TabsContent value="info" className="m-0 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Departamento</Label>
                  <p className="font-medium">{person.department || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cargo</Label>
                  <p className="font-medium">{person.role || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cadastrado em</Label>
                  <p className="font-medium">{format(new Date(person.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Última atualização</Label>
                  <p className="font-medium">{format(new Date(person.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history" className="m-0">
              {loadingLogs ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : recognitionLogs.length > 0 ? (
                <div className="space-y-2">
                  {recognitionLogs.map(log => (
                    <div key={log.id} className={cn(
                      'p-3 rounded-lg border-l-4',
                      log.recognized ? 'border-l-success bg-success/5' : 'border-l-destructive bg-destructive/5'
                    )}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {log.recognized ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          <span className="font-medium">{log.recognized ? 'Reconhecido' : 'Não reconhecido'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      {log.confidence && (
                        <p className="text-xs text-muted-foreground mt-1">Confiança: {Math.round(Number(log.confidence) * 100)}%</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ScanFace className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Nenhum reconhecimento registrado</p>
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t pt-4 mt-4">
          <Button variant="outline" onClick={onEdit}><Edit className="w-4 h-4 mr-2" />Editar</Button>
          <Button variant="destructive" onClick={onDelete}><Trash2 className="w-4 h-4 mr-2" />Excluir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
