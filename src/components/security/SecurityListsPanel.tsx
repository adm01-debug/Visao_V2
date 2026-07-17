import { useState } from 'react';
import { ShieldCheck, ShieldOff, Eye, User, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { SecurityPerson, ListType } from './SecurityTypes';
import { listTypeConfig } from './SecurityTypes';

interface SecurityListsPanelProps {
  persons: SecurityPerson[];
  onPersonsChange: (persons: SecurityPerson[]) => void;
}

export function SecurityListsPanel({ persons, onPersonsChange }: SecurityListsPanelProps) {
  const [addPersonDialog, setAddPersonDialog] = useState<ListType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<SecurityPerson | null>(null);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonReason, setNewPersonReason] = useState('');

  const addPersonToList = async () => {
    if (!addPersonDialog || !newPersonName) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Usuário não autenticado'); return; }

      const { data, error } = await supabase.from('registered_persons')
        .insert({ name: newPersonName, list_type: addPersonDialog, notes: newPersonReason, user_id: user.id })
        .select().single();

      if (error) throw error;

      onPersonsChange([...persons, { id: data.id, name: data.name, listType: addPersonDialog, reason: newPersonReason, addedAt: data.created_at }]);
      toast.success(`Pessoa adicionada à ${listTypeConfig[addPersonDialog].label}`);
      setAddPersonDialog(null);
      setNewPersonName('');
      setNewPersonReason('');
    } catch { toast.error('Erro ao adicionar pessoa'); }
  };

  const removePersonFromList = async () => {
    if (!deleteConfirm) return;
    try {
      await supabase.from('registered_persons').delete().eq('id', deleteConfirm.id);
      onPersonsChange(persons.filter(p => p.id !== deleteConfirm.id));
      toast.success('Pessoa removida da lista');
      setDeleteConfirm(null);
    } catch { toast.error('Erro ao remover pessoa'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button onClick={() => setAddPersonDialog('whitelist')} variant="outline"><ShieldCheck className="w-4 h-4 mr-2 text-success" />Adicionar à Whitelist</Button>
        <Button onClick={() => setAddPersonDialog('blacklist')} variant="outline"><ShieldOff className="w-4 h-4 mr-2 text-destructive" />Adicionar à Blacklist</Button>
        <Button onClick={() => setAddPersonDialog('watchlist')} variant="outline"><Eye className="w-4 h-4 mr-2 text-warning" />Adicionar à Watchlist</Button>
      </div>

      <div className="grid gap-4">
        {(['whitelist', 'blacklist', 'watchlist'] as ListType[]).map(listType => {
          const config = listTypeConfig[listType];
          const listPersons = persons.filter(p => p.listType === listType);
          const Icon = config.icon;
          return (
            <Card key={listType}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Icon className={cn('w-5 h-5', config.color)} />{config.label}
                  <Badge variant="secondary" className="ml-2">{listPersons.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {listPersons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pessoa nesta lista</p>
                ) : (
                  <div className="grid gap-2">
                    {listPersons.map(person => (
                      <div key={person.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {person.photo ? <img src={person.photo} alt="" className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-muted-foreground" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{person.name}</p>
                            {person.reason && <p className="text-xs text-muted-foreground">{person.reason}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirm(person)}>
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!addPersonDialog} onOpenChange={() => setAddPersonDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar à {addPersonDialog && listTypeConfig[addPersonDialog].label}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome</Label><Input value={newPersonName} onChange={e => setNewPersonName(e.target.value)} placeholder="Nome da pessoa" /></div>
            <div><Label>Motivo (opcional)</Label><Textarea value={newPersonReason} onChange={e => setNewPersonReason(e.target.value)} placeholder="Motivo para adicionar à lista" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPersonDialog(null)}>Cancelar</Button>
            <Button onClick={addPersonToList} disabled={!newPersonName}>Adicionar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover da lista?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover "{deleteConfirm?.name}" da lista?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removePersonFromList}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
