import { useEffect, useMemo, useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Network, ShieldCheck } from 'lucide-react';
import { useCollabGovernance } from '@/hooks/useCollabGovernance';
import { CollabInvitesCard } from '@/components/collab/CollabInvitesCard';
import { CollabMembersCard } from '@/components/collab/CollabMembersCard';

/**
 * Onda 129 — Operação da rede colaborativa de placas.
 *
 * A tela nunca decide autoridade: ela reflete o que as rotinas da Onda 128
 * permitiriam e deixa o banco ter a última palavra. Se um botão e o banco
 * discordarem, quem está errado é o botão — e o erro volta traduzido ao operador.
 */
export default function CollabNetworkPage() {
  const [networkId, setNetworkId] = useState<string | null>(null);
  const governance = useCollabGovernance(networkId);

  const networks = governance.networks.data ?? [];
  const viewerOrgIds = useMemo(() => governance.viewerOrgs.data ?? [], [governance.viewerOrgs.data]);

  // Uma rede só: selecionar sozinho poupa um clique sem esconder a escolha.
  useEffect(() => {
    const first = networks[0];
    if (networkId === null && first) setNetworkId(first.id);
  }, [networkId, networks]);

  const selectedNetwork = networks.find((network) => network.id === networkId) ?? null;
  const viewerIsNetworkOwner =
    selectedNetwork !== null && viewerOrgIds.includes(selectedNetwork.owner_org_id);

  const isBusy =
    governance.invite.isPending ||
    governance.respond.isPending ||
    governance.revoke.isPending ||
    governance.setMembership.isPending ||
    governance.removeMembership.isPending;

  const loadingShell = governance.networks.isLoading || governance.organizations.isLoading;

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <PageMeta
        title="Rede colaborativa | VISÃO"
        description="Gerencie convites, participantes e governança da rede colaborativa de placas entre organizações."
      />

      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Network className="h-6 w-6 text-primary" aria-hidden="true" />
          Rede colaborativa
        </h1>
        <p className="text-sm text-muted-foreground">
          Convites, participação e governança das organizações que trocam alertas de placas.
        </p>
      </header>

      {loadingShell ? (
        <Skeleton className="h-24 w-full" />
      ) : networks.length === 0 ? (
        <Alert>
          <AlertTitle>Nenhuma rede disponível</AlertTitle>
          <AlertDescription>
            Sua organização ainda não participa de nenhuma rede colaborativa. Crie uma rede ou aguarde
            um convite para começar a trocar alertas.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Rede em foco
              </CardTitle>
              <CardDescription>
                Toda ação desta tela fica registrada em uma trilha de auditoria que ninguém — nem a
                dona da rede — consegue apagar.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-center">
              <Select value={networkId ?? ''} onValueChange={setNetworkId}>
                <SelectTrigger className="md:w-96" aria-label="Selecionar rede colaborativa">
                  <SelectValue placeholder="Selecione uma rede" />
                </SelectTrigger>
                <SelectContent>
                  {networks.map((network) => (
                    <SelectItem key={network.id} value={network.id}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Badge variant={viewerIsNetworkOwner ? 'default' : 'outline'}>
                  {viewerIsNetworkOwner ? 'Você administra esta rede' : 'Você participa desta rede'}
                </Badge>
                {selectedNetwork?.reciprocity_required && (
                  <Badge variant="secondary">Reciprocidade exigida</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <CollabInvitesCard
            invitations={governance.invitations.data ?? []}
            organizations={governance.organizations.data ?? []}
            memberships={governance.memberships.data ?? []}
            viewerIsNetworkOwner={viewerIsNetworkOwner}
            viewerOrgIds={viewerOrgIds}
            isLoading={governance.invitations.isLoading}
            onInvite={(input) => governance.invite.mutate(input)}
            onRespond={(input) => governance.respond.mutate(input)}
            onRevoke={(invitationId) => governance.revoke.mutate(invitationId)}
            isBusy={isBusy}
          />

          <CollabMembersCard
            memberships={governance.memberships.data ?? []}
            organizations={governance.organizations.data ?? []}
            ownerOrgId={selectedNetwork?.owner_org_id ?? null}
            viewerIsNetworkOwner={viewerIsNetworkOwner}
            isLoading={governance.memberships.isLoading}
            onSetStatus={(input) => governance.setMembership.mutate(input)}
            onRemove={(organizationId) => governance.removeMembership.mutate(organizationId)}
            isBusy={isBusy}
          />
        </>
      )}
    </div>
  );
}
