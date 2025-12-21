import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

type Permission = 'cameras:read' | 'cameras:write' | 'alerts:read' | 'alerts:write' | 'users:manage' | 'settings:manage';

export function usePermissions() {
  const { user } = useAuth();

  const permissions = useMemo(() => {
    const role = user?.user_metadata?.role || 'viewer';
    const allPermissions: Permission[] = ['cameras:read', 'cameras:write', 'alerts:read', 'alerts:write', 'users:manage', 'settings:manage'];
    const viewerPermissions: Permission[] = ['cameras:read', 'alerts:read'];
    return role === 'admin' ? allPermissions : viewerPermissions;
  }, [user]);

  const can = (permission: Permission) => permissions.includes(permission);
  const canAll = (...perms: Permission[]) => perms.every(p => permissions.includes(p));
  const canAny = (...perms: Permission[]) => perms.some(p => permissions.includes(p));

  return { permissions, can, canAll, canAny };
}
