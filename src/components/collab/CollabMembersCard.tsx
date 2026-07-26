import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import { deriveMembershipView } from '@/lib/collab/collabGovernanceView';
import type { MembershipStatus } from '@/lib/collab/collabGovernance';
import type { CollabMembershipRow, OrganizationRow } from '@/hooks/useCollabGovernance';

const TONE_VARIANT = {
  pending: 'secondary',
  positive: 'default',
  neutral: 'outline',
  negative: 'destructive',
} as const;

export interface CollabMembersCardProps {
  memberships: CollabMembershipRow[];
  organizations: OrganizationRow[];
  ownerOrgId: string | null;
  viewerIsNetworkOwner: boolean;
  isLoading: boolean;
  onSetStatus: (input: { organizationId: string; status: MembershipStatus }) => void;
  onRemove: (organizationId: string) => void;
  isBusy: boolean;
}

export function CollabMembersCard({
  memberships,
  organizations,
  ownerOrgId,
  viewerIsNetworkOwner,
  isLoading,
  onSetStatus,
  onRemove,
  isBusy,
}: CollabMembersCardProps) {
  const [pendingRemoval, setPendingRemoval] = useState<CollabMembershipRow | null>(null);

  const orgName = useMemo(() => {
    const map = new Map(organizations.map((org) => [org.id, org.name]));
    return (id: string) => map.get(id) ?? 'Organização desconhecida';
  }, [organizations]);

  const activeCount = memberships.filter((membership) => membership.status === 'active').length;
  const removalView = pendingRemoval
    ? deriveMembershipView({
        viewerIsNetworkOwner,
        isOwnerMembership: pendingRemoval.organization_id === ownerOrgId,
        status: pendingRemoval.status,
      })
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-4 w-4" aria-hidden="true" />
          Participantes
        </CardTitle>
        <CardDescription>
          {activeCount} organização(ões) ativa(s). Suspender pausa a troca sem perder o acervo;
          remover revoga em definitivo tudo o que a organização compartilhou.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma organização participa desta rede.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Situação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memberships.map((membership) => {
                  const isOwnerMembership = membership.organization_id === ownerOrgId;
                  const view = deriveMembershipView({
                    viewerIsNetworkOwner,
                    isOwnerMembership,
                    status: membership.status,
                  });
                  return (
                    <TableRow key={membership.id}>
                      <TableCell className="font-medium">
                        {orgName(membership.organization_id)}
                        {isOwnerMembership && (
                          <Badge variant="outline" className="ml-2">
                            Dona da rede
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={TONE_VARIANT[view.tone]}>{view.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {view.canSuspend && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isBusy}
                              onClick={() =>
                                onSetStatus({
                                  organizationId: membership.organization_id,
                                  status: 'suspended',
                                })
                              }
                            >
                              <PauseCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                              Suspender
                            </Button>
                          )}
                          {view.canReinstate && (
                            <Button
                              size="sm"
                              disabled={isBusy}
                              onClick={() =>
                                onSetStatus({
                                  organizationId: membership.organization_id,
                                  status: 'active',
                                })
                              }
                            >
                              <PlayCircle className="mr-1 h-3 w-3" aria-hidden="true" />
                              Reativar
                            </Button>
                          )}
                          {view.canRemove && (
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={isBusy}
                              onClick={() => setPendingRemoval(membership)}
                            >
                              <Trash2 className="mr-1 h-3 w-3" aria-hidden="true" />
                              Remover
                            </Button>
                          )}
                          {!view.canSuspend && !view.canReinstate && !view.canRemove && (
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

      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => !open && setPendingRemoval(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remover {pendingRemoval ? orgName(pendingRemoval.organization_id) : ''} da rede?
            </AlertDialogTitle>
            <AlertDialogDescription>{removalView?.removeWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingRemoval) onRemove(pendingRemoval.organization_id);
                setPendingRemoval(null);
              }}
            >
              Remover em definitivo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
