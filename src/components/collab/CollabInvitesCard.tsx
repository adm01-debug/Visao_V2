import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, ShieldX, Check, X, Clock } from 'lucide-react';
import { COLLAB_GOVERNANCE_POLICY as POLICY } from '@/lib/collab/collabGovernance';
import { deriveInviteView, formatRemaining, type InviteTone } from '@/lib/collab/collabGovernanceView';
import type {
  CollabInvitationRow,
  CollabMembershipRow,
  OrganizationRow,
} from '@/hooks/useCollabGovernance';

const TONE_VARIANT: Record<InviteTone, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'secondary',
  positive: 'default',
  neutral: 'outline',
  negative: 'destructive',
};

export interface CollabInvitesCardProps {
  invitations: CollabInvitationRow[];
  organizations: OrganizationRow[];
  memberships: CollabMembershipRow[];
  viewerIsNetworkOwner: boolean;
  viewerOrgIds: string[];
  isLoading: boolean;
  onInvite: (input: { invitedOrgId: string; ttlDays: number | null; note: string | null }) => void;
  onRespond: (input: { invitationId: string; accept: boolean }) => void;
  onRevoke: (invitationId: string) => void;
  isBusy: boolean;
  now?: Date;
}

export function CollabInvitesCard({
  invitations,
  organizations,
  memberships,
  viewerIsNetworkOwner,
  viewerOrgIds,
  isLoading,
  onInvite,
  onRespond,
  onRevoke,
  isBusy,
  now = new Date(),
}: CollabInvitesCardProps) {
  const [invitedOrgId, setInvitedOrgId] = useState('');
  const [ttlDays, setTtlDays] = useState(String(POLICY.defaultInviteTtlDays));
  const [note, setNote] = useState('');

  const orgName = useMemo(() => {
    const map = new Map(organizations.map((org) => [org.id, org.name]));
    return (id: string) => map.get(id) ?? 'Organização desconhecida';
  }, [organizations]);

  const pendingCount = useMemo(
    () =>
      invitations.filter(
        (invitation) =>
          deriveInviteView({
            viewerIsNetworkOwner,
            viewerOrgId: null,
            invitedOrgId: invitation.invited_org_id,
            storedStatus: invitation.status,
            expiresAt: invitation.expires_at,
            now,
          }).effectiveStatus === 'pending',
      ).length,
    [invitations, viewerIsNetworkOwner, now],
  );

  // Já participa da rede? Então não é candidata a convite — o banco recusaria.
  const candidates = useMemo(() => {
    const engaged = new Set(memberships.map((membership) => membership.organization_id));
    return organizations.filter((org) => !engaged.has(org.id));
  }, [organizations, memberships]);

  const parsedTtl = Number.parseInt(ttlDays, 10);
  const ttlIsValid =
    Number.isInteger(parsedTtl) && parsedTtl >= 1 && parsedTtl <= POLICY.maxInviteTtlDays;
  const quotaReached = pendingCount >= POLICY.maxPendingInvitesPerNetwork;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-4 w-4" aria-hidden="true" />
          Convites
        </CardTitle>
        <CardDescription>
          {pendingCount} de {POLICY.maxPendingInvitesPerNetwork} convites em aberto. Convites vencem
          sozinhos: um convite vencido não admite ninguém, mesmo que ainda apareça na lista do banco.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {viewerIsNetworkOwner && (
          <form
            className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (!invitedOrgId || !ttlIsValid) return;
              onInvite({ invitedOrgId, ttlDays: parsedTtl, note: note.trim() || null });
              setInvitedOrgId('');
              setNote('');
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="collab-invite-org">Organização convidada</Label>
              <Select value={invitedOrgId} onValueChange={setInvitedOrgId}>
                <SelectTrigger id="collab-invite-org">
                  <SelectValue placeholder="Selecione uma organização" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collab-invite-ttl">Validade (dias)</Label>
              <Input
                id="collab-invite-ttl"
                type="number"
                min={1}
                max={POLICY.maxInviteTtlDays}
                value={ttlDays}
                onChange={(event) => setTtlDays(event.target.value)}
                aria-invalid={!ttlIsValid}
              />
            </div>
            <Button type="submit" disabled={!invitedOrgId || !ttlIsValid || quotaReached || isBusy}>
              Enviar convite
            </Button>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="collab-invite-note">Observação (opcional)</Label>
              <Textarea
                id="collab-invite-note"
                value={note}
                maxLength={500}
                rows={2}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Contexto do convite para a organização destinatária"
              />
            </div>
          </form>
        )}

        {quotaReached && (
          <Alert variant="destructive">
            <AlertDescription>
              A rede atingiu {POLICY.maxPendingInvitesPerNetwork} convites em aberto. Revogue convites
              parados antes de enviar novos.
            </AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum convite registrado nesta rede.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const viewerOrgId = viewerOrgIds.includes(invitation.invited_org_id)
                    ? invitation.invited_org_id
                    : (viewerOrgIds[0] ?? null);
                  const view = deriveInviteView({
                    viewerIsNetworkOwner,
                    viewerOrgId,
                    invitedOrgId: invitation.invited_org_id,
                    storedStatus: invitation.status,
                    expiresAt: invitation.expires_at,
                    now,
                  });
                  const remaining = formatRemaining(view.secondsRemaining);
                  return (
                    <TableRow key={invitation.id}>
                      <TableCell>
                        <span className="font-medium">{orgName(invitation.invited_org_id)}</span>
                        {invitation.note && (
                          <p className="text-xs text-muted-foreground">{invitation.note}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TONE_VARIANT[view.tone]}>{view.label}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {remaining ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {remaining}
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {view.canAccept && (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() => onRespond({ invitationId: invitation.id, accept: true })}
                            >
                              <Check className="mr-1 h-3 w-3" aria-hidden="true" />
                              Aceitar
                            </Button>
                          )}
                          {view.canDecline && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() => onRespond({ invitationId: invitation.id, accept: false })}
                            >
                              <X className="mr-1 h-3 w-3" aria-hidden="true" />
                              Recusar
                            </Button>
                          )}
                          {view.canRevoke && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isBusy}
                              onClick={() => onRevoke(invitation.id)}
                            >
                              <ShieldX className="mr-1 h-3 w-3" aria-hidden="true" />
                              Revogar
                            </Button>
                          )}
                          {!view.canAccept && !view.canDecline && !view.canRevoke && (
                            <span className="text-xs text-muted-foreground">Sem ações</span>
                          )}
                        </div>
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
