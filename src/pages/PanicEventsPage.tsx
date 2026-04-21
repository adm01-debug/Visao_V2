/**
 * VISÃO - Página: Eventos de Pânico (Refactored)
 */
import { useState, useMemo } from 'react';
import { Search, Filter, Shield, ShieldAlert } from 'lucide-react';
import { usePanicButton, PanicEvent } from '@/hooks/usePanicButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2 } from 'lucide-react';
import { PanicStatsCards } from '@/components/panic-events/PanicStatsCards';
import { PanicEventCard } from '@/components/panic-events/PanicEventCard';
import { PanicEventDetailDialog } from '@/components/panic-events/PanicEventDetailDialog';
import { PageMeta } from '@/components/PageMeta';

export default function PanicEventsPage() {
  const { events, isLoading, resolvePanic, unresolvedCount } = usePanicButton();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEvent, setSelectedEvent] = useState<PanicEvent | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [eventToResolve, setEventToResolve] = useState<PanicEvent | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      if (statusFilter === 'active' && event.resolved) return false;
      if (statusFilter === 'resolved' && !event.resolved) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [event.user_name, event.user_email, event.user_phone, event.location_address, event.notes, event.resolved_by]
          .filter(Boolean).join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    });
  }, [events, statusFilter, searchQuery]);

  const handleResolve = (event: PanicEvent) => {
    setEventToResolve(event);
    setResolveNotes('');
    setShowResolveDialog(true);
  };

  const confirmResolve = () => {
    if (!eventToResolve) return;
    resolvePanic.mutate({ eventId: eventToResolve.id, notes: resolveNotes });
    setShowResolveDialog(false);
    setEventToResolve(null);
    setSelectedEvent(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
      <PageMeta title="Eventos de Pânico" description="Monitore e gerencie eventos de pânico" />
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
        <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 mb-mobile-nav">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-destructive" />Eventos de Pânico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie e resolva alertas de pânico acionados pelos usuários</p>
        </div>
      </div>

      <PanicStatsCards unresolvedCount={unresolvedCount} totalCount={events.length} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email, local..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {statusFilter !== 'all' ? 'Tente alterar os filtros' : 'Nenhum evento de pânico registrado ainda'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map(event => (
            <PanicEventCard key={event.id} event={event} onClick={setSelectedEvent} onResolve={handleResolve} />
          ))}
        </div>
      )}

      <PanicEventDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} onResolve={handleResolve} />

      {/* Resolve Confirmation Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolver Evento de Pânico</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Confirma a resolução deste evento de pânico? Esta ação marcará o incidente como resolvido.</p>
            <div className="space-y-2">
              <Label htmlFor="resolve-notes">Observações (opcional)</Label>
              <Textarea id="resolve-notes" placeholder="Descreva as ações tomadas..." value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>Cancelar</Button>
            <Button onClick={confirmResolve} disabled={resolvePanic.isPending} className="gap-2">
              <CheckCircle2 className="w-4 h-4" />{resolvePanic.isPending ? 'Resolvendo...' : 'Confirmar Resolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
