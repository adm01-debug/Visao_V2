/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Eventos de Pânico
 */

import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Phone,
  Mail,
  User,
  Search,
  Shield,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { usePanicButton, PanicEvent } from '@/hooks/usePanicButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function StatusBadge({ resolved }: { resolved: boolean }) {
  return resolved ? (
    <Badge variant="secondary" className="gap-1">
      <CheckCircle2 className="w-3 h-3" />
      Resolvido
    </Badge>
  ) : (
    <Badge variant="destructive" className="gap-1 animate-pulse">
      <ShieldAlert className="w-3 h-3" />
      Ativo
    </Badge>
  );
}

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
      // Status filter
      if (statusFilter === 'active' && event.resolved) return false;
      if (statusFilter === 'resolved' && !event.resolved) return false;

      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable = [
          event.user_name,
          event.user_email,
          event.user_phone,
          event.location_address,
          event.notes,
          event.resolved_by,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
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

  const openGoogleMaps = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="w-7 h-7 text-destructive" />
            Eventos de Pânico
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie e resolva alertas de pânico acionados pelos usuários
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-destructive/10">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unresolvedCount}</p>
              <p className="text-sm text-muted-foreground">Ativos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-secondary">
              <CheckCircle2 className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length - unresolvedCount}</p>
              <p className="text-sm text-muted-foreground">Resolvidos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email, local..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
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
              {statusFilter !== 'all'
                ? 'Tente alterar os filtros'
                : 'Nenhum evento de pânico registrado ainda'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => (
            <Card
              key={event.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                !event.resolved ? 'border-destructive/30 bg-destructive/5' : ''
              }`}
              onClick={() => setSelectedEvent(event)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-full mt-0.5 ${
                        event.resolved
                          ? 'bg-secondary'
                          : 'bg-destructive/10'
                      }`}
                    >
                      {event.resolved ? (
                        <CheckCircle2 className="w-5 h-5 text-secondary-foreground" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-destructive" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">
                          {event.user_name || 'Usuário'}
                        </span>
                        <StatusBadge resolved={event.resolved} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                        {event.user_email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {event.user_email}
                          </span>
                        )}
                        {event.user_phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {event.user_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(event.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {event.location_address && (
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {event.location_address}
                        </p>
                      )}
                      {event.latitude && event.longitude && !event.location_address && (
                        <button
                          className="text-sm text-primary mt-1 flex items-center gap-1 hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            openGoogleMaps(event.latitude!, event.longitude!);
                          }}
                        >
                          <MapPin className="w-3 h-3" />
                          {event.latitude.toFixed(4)}, {event.longitude.toFixed(4)}
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!event.resolved && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-shrink-0 gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleResolve(event);
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Resolver
                    </Button>
                  )}
                </div>

                {event.resolved && event.resolved_by && (
                  <div className="mt-3 pt-3 border-t text-sm text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Resolvido por: {event.resolved_by}
                    </span>
                    {event.resolved_at && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(event.resolved_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Event Detail Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-lg">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  Detalhes do Evento
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <StatusBadge resolved={selectedEvent.resolved} />
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedEvent.created_at).toLocaleString('pt-BR')}
                  </span>
                </div>

                <div className="grid gap-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{selectedEvent.user_name || 'N/A'}</span>
                  </div>
                  {selectedEvent.user_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedEvent.user_email}</span>
                    </div>
                  )}
                  {selectedEvent.user_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{selectedEvent.user_phone}</span>
                    </div>
                  )}
                </div>

                {selectedEvent.latitude && selectedEvent.longitude && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Localização</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-1 gap-2 w-full justify-start"
                      onClick={() =>
                        openGoogleMaps(selectedEvent.latitude!, selectedEvent.longitude!)
                      }
                    >
                      <MapPin className="w-4 h-4" />
                      {selectedEvent.location_address ||
                        `${selectedEvent.latitude.toFixed(6)}, ${selectedEvent.longitude.toFixed(6)}`}
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </Button>
                  </div>
                )}

                {selectedEvent.notes && (
                  <div>
                    <Label className="text-sm text-muted-foreground">Observações</Label>
                    <p className="mt-1 text-sm bg-muted p-3 rounded-md">{selectedEvent.notes}</p>
                  </div>
                )}

                {selectedEvent.resolved && (
                  <div className="bg-muted/40 border border-border rounded-lg p-3 space-y-1">
                    <p className="text-sm font-medium text-foreground">
                      ✅ Resolvido
                    </p>
                    {selectedEvent.resolved_by && (
                      <p className="text-sm text-muted-foreground">
                        Por: {selectedEvent.resolved_by}
                      </p>
                    )}
                    {selectedEvent.resolved_at && (
                      <p className="text-sm text-muted-foreground">
                        Em: {new Date(selectedEvent.resolved_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                {!selectedEvent.resolved && (
                  <Button
                    onClick={() => handleResolve(selectedEvent)}
                    className="gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolver Incidente
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Resolve Confirmation Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Evento de Pânico</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Confirma a resolução deste evento de pânico? Esta ação marcará o
              incidente como resolvido.
            </p>
            <div className="space-y-2">
              <Label htmlFor="resolve-notes">Observações (opcional)</Label>
              <Textarea
                id="resolve-notes"
                placeholder="Descreva as ações tomadas..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={confirmResolve}
              disabled={resolvePanic.isPending}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {resolvePanic.isPending ? 'Resolvendo...' : 'Confirmar Resolução'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
