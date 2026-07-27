import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyRound, ShieldOff, Undo2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CAPABILITIES,
  CAPABILITY_LABELS,
  type AppRole,
  type Capability,
  type CapabilityGrantEffect,
} from '@/lib/permissions/capabilities';
import {
  GRANT_ROW_STATE_LABELS,
  MAX_GRANT_DAYS,
  evaluateGrantRequest,
  grantRowState,
  projectGrantEffect,
  remainingHours,
} from '@/lib/permissions/grantConsole';
import { useCapabilityGrants } from '@/hooks/useCapabilityGrants';

export interface CapabilityGrantsCardProps {
  /** Usuários administráveis (vem do painel de gestão). */
  users: readonly { id: string; email: string; role: AppRole }[];
  actorId: string;
  actorRole: AppRole;
}

const DURATIONS = [1, 7, 15, 30, 90] as const;
const DAY_MS = 86_400_000;

/**
 * Onda 151 — console humano de concessões finas.
 *
 * A tela pré-valida com a MESMA regra do banco (`grantConsole.ts`) para
 * explicar a recusa antes do clique, mas nunca decide sozinha: a escrita é
 * sempre pela rotina do servidor. Se as duas divergirem, quem manda é o
 * servidor — e a divergência é falha de gate, não de tela.
 */
export function CapabilityGrantsCard({ users, actorId, actorRole }: CapabilityGrantsCardProps) {
  const { loading, grants, grantsOf, createGrant, revokeGrant } = useCapabilityGrants();
  const [targetId, setTargetId] = useState<string>('');
  const [capability, setCapability] = useState<Capability>('cameras.ptz.control');
  const [effect, setEffect] = useState<CapabilityGrantEffect>('grant');
  const [days, setDays] = useState<number>(7);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nowMs = Date.now();
  const target = users.find((u) => u.id === targetId);

  const request = useMemo(
    () => ({
      actorId,
      actorRole,
      actorGrants: grantsOf(actorId),
      targetId: target?.id ?? '',
      targetRole: target?.role ?? ('viewer' as AppRole),
      targetGrants: target ? grantsOf(target.id) : [],
      capability,
      effect,
      reason,
      expiresAtMs: nowMs + days * DAY_MS,
    }),
    [actorId, actorRole, grantsOf, target, capability, effect, reason, days, nowMs],
  );

  const decision = target ? evaluateGrantRequest(request, nowMs) : null;
  const projection = target && decision?.allowed ? projectGrantEffect(request, nowMs) : null;

  const handleSubmit = async () => {
    if (!target || !decision?.allowed) return;
    setSubmitting(true);
    const result = await createGrant({
      userId: target.id,
      capability,
      effect,
      reason: reason.trim(),
      expiresAtMs: request.expiresAtMs,
    });
    setSubmitting(false);
    toast({
      title: result.ok ? 'Permissão atualizada' : 'Não foi possível registrar',
      description: result.message,
      variant: result.ok ? 'default' : 'destructive',
    });
    if (result.ok) setReason('');
  };

  const handleRevoke = async (grantId: string) => {
    const result = await revokeGrant(grantId, 'revogado pelo console');
    toast({
      title: result.ok ? 'Revogação aplicada' : 'Falha ao revogar',
      description: result.message,
      variant: result.ok ? 'default' : 'destructive',
    });
  };

  const emailOf = (userId: string) => users.find((u) => u.id === userId)?.email ?? userId.slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5" />
          <CardTitle>Permissões finas ({loading ? '...' : grants.length})</CardTitle>
        </div>
        <CardDescription>
          Exceções nominais com prazo obrigatório de até {MAX_GRANT_DAYS} dias. Papel é o piso;
          a concessão é apenas o ajuste de borda — e toda linha fica na trilha de auditoria.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {users.filter((u) => u.id !== actorId).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Capacidade</Label>
            <Select value={capability} onValueChange={(v) => setCapability(v as Capability)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAPABILITIES.map((c) => (
                  <SelectItem key={c} value={c}>{CAPABILITY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Efeito</Label>
            <Select value={effect} onValueChange={(v) => setEffect(v as CapabilityGrantEffect)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="grant">Conceder</SelectItem>
                <SelectItem value="deny">Negar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Prazo</Label>
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d} value={String(d)}>{d} dia{d > 1 ? 's' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label htmlFor="grant-reason">Justificativa</Label>
            <Input
              id="grant-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: manutenção do integrador até sexta"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {!target
              ? 'Selecione um usuário para avaliar a concessão.'
              : decision?.allowed
                ? `Efeito previsto: ${projection?.before.length} → ${projection?.after.length} capacidades.`
                : decision?.message}
          </p>
          <Button onClick={handleSubmit} disabled={!decision?.allowed || submitting}>
            {effect === 'deny' ? <ShieldOff className="mr-2 h-4 w-4" /> : <KeyRound className="mr-2 h-4 w-4" />}
            {submitting ? 'Registrando...' : effect === 'deny' ? 'Registrar negação' : 'Conceder'}
          </Button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : grants.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma exceção registrada — todos operam pelo piso do próprio papel.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Capacidade</TableHead>
                  <TableHead>Efeito</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Prazo</TableHead>
                  <TableHead className="hidden lg:table-cell">Justificativa</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {grants.map((grant) => {
                  const state = grantRowState(grant, nowMs);
                  const hours = remainingHours(grant.expiresAtMs, nowMs);
                  return (
                    <TableRow key={grant.id}>
                      <TableCell className="text-sm">{emailOf(grant.userId)}</TableCell>
                      <TableCell className="text-sm">
                        {CAPABILITY_LABELS[grant.capability as Capability] ?? grant.capability}
                      </TableCell>
                      <TableCell>
                        <Badge variant={grant.effect === 'deny' ? 'destructive' : 'default'}>
                          {grant.effect === 'deny' ? 'Negação' : 'Concessão'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={state === 'active' ? 'secondary' : 'outline'}>
                          {GRANT_ROW_STATE_LABELS[state]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {grant.expiresAtMs
                          ? `${format(new Date(grant.expiresAtMs), 'dd/MM/yyyy HH:mm', { locale: ptBR })}${
                              state === 'active' && hours != null ? ` (${hours}h)` : ''
                            }`
                          : '—'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {grant.reason ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {state === 'active' && (
                          <Button variant="ghost" size="sm" onClick={() => handleRevoke(grant.id)}>
                            <Undo2 className="mr-1 h-4 w-4" /> Revogar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CapabilityGrantsCard;
