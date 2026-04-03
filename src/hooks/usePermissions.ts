import { useMemo } from 'react';
import { useUserRole, type AppRole } from '@/hooks/useUserRole';

type Permission =
  | 'cameras:read' | 'cameras:write' | 'cameras:delete' | 'cameras:control'
  | 'alerts:read' | 'alerts:write' | 'alerts:delete' | 'alerts:acknowledge'
  | 'recordings:read' | 'recordings:download' | 'recordings:delete'
  | 'users:read' | 'users:manage'
  | 'settings:read' | 'settings:manage'
  | 'reports:read' | 'reports:create' | 'reports:export';

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  admin: [
    'cameras:read', 'cameras:write', 'cameras:delete', 'cameras:control',
    'alerts:read', 'alerts:write', 'alerts:delete', 'alerts:acknowledge',
    'recordings:read', 'recordings:download', 'recordings:delete',
    'users:read', 'users:manage',
    'settings:read', 'settings:manage',
    'reports:read', 'reports:create', 'reports:export',
  ],
  manager: [
    'cameras:read', 'cameras:write', 'cameras:control',
    'alerts:read', 'alerts:write', 'alerts:acknowledge',
    'recordings:read', 'recordings:download',
    'users:read',
    'settings:read',
    'reports:read', 'reports:create', 'reports:export',
  ],
  operator: [
    'cameras:read', 'cameras:control',
    'alerts:read', 'alerts:acknowledge',
    'recordings:read',
    'settings:read',
    'reports:read',
  ],
  viewer: [
    'cameras:read',
    'alerts:read',
    'recordings:read',
    'reports:read',
  ],
};

export function usePermissions() {
  const { role, loading } = useUserRole();

  const permissions = useMemo(() => ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.viewer, [role]);

  const can = (permission: Permission) => permissions.includes(permission);
  const canAll = (...perms: Permission[]) => perms.every(p => permissions.includes(p));
  const canAny = (...perms: Permission[]) => perms.some(p => permissions.includes(p));

  return { permissions, can, canAll, canAny, role, loading };
}
