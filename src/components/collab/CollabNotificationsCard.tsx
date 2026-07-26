/**
 * Onda 130 — Caixa de entrada da rede colaborativa.
 *
 * A tela não interpreta autoridade: ela mostra o que o banco entregou para as
 * organizações do usuário. Se um aviso não está aqui, é porque a RLS decidiu
 * que ele não é desta organização — e não porque a UI o escondeu.
 */

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Inbox } from 'lucide-react';
import {
  formatUnreadBadge,
  type CollabNotificationKind,
  type CollabNotificationSeverity,
} from '@/lib/collab/collabNotifications';
import {
  useCollabNotifications,
  type CollabNotificationItem,
} from '@/hooks/useCollabNotifications';

const KIND_LABEL: Record<CollabNotificationKind, string> = {
  invite_received: 'Convite recebido',
  invite_accepted: 'Convite aceito',
  invite_declined: 'Convite recusado',
  invite_revoked: 'Convite revogado',
  invite_expired: 'Convite vencido',
  membership_suspended: 'Participação suspensa',
  membership_reinstated: 'Participação reativada',
  membership_removed: 'Participação removida',
};

const SEVERITY_VARIANT: Record<CollabNotificationSeverity, 'secondary' | 'outline' | 'destructive'> = {
  info: 'outline',
  attention: 'secondary',
  critical: 'destructive',
};

export interface CollabNotificationsCardProps {
  networkId: string | null;
  orgNameById: ReadonlyMap<string, string>;
}

export function CollabNotificationsCard({ networkId, orgNameById }: CollabNotificationsCardProps) {
  const { notifications, markRead } = useCollabNotifications(networkId);

  const items = useMemo<CollabNotificationItem[]>(
    () => notifications.data ?? [],
    [notifications.data],
  );
  const unreadIds = useMemo(() => items.filter((i) => !i.read).map((i) => i.id), [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" aria-hidden="true" />
            Avisos da rede
            {unreadIds.length > 0 && (
              <Badge variant="secondary" aria-label={`${unreadIds.length} avisos não lidos`}>
                {formatUnreadBadge(unreadIds.length)}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Somente as organizações envolvidas em cada fato recebem o aviso correspondente.
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={unreadIds.length === 0 || markRead.isPending}
          onClick={() => markRead.mutate(unreadIds)}
        >
          Marcar tudo como lido
        </Button>
      </CardHeader>

      <CardContent>
        {notifications.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum aviso nesta rede.</p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[item.severity]}>{KIND_LABEL[item.kind]}</Badge>
                    {!item.read && (
                      <span className="text-xs font-medium text-primary">Não lido</span>
                    )}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    {item.actor_org_id
                      ? `Origem: ${orgNameById.get(item.actor_org_id) ?? 'organização parceira'}`
                      : 'Origem: sistema'}
                    {' · '}
                    {new Date(item.created_at).toLocaleString('pt-BR')}
                  </p>
                </div>
                {!item.read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={markRead.isPending}
                    onClick={() => markRead.mutate([item.id])}
                  >
                    Marcar como lido
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
