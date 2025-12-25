type Permission = 'admin' | 'manager' | 'operator' | 'viewer';
type Resource = 'cameras' | 'alerts' | 'recordings' | 'users' | 'settings' | 'reports';
type Action = 'create' | 'read' | 'update' | 'delete' | 'export';

const PERMISSIONS: Record<Permission, Record<Resource, Action[]>> = {
  admin: {
    cameras: ['create', 'read', 'update', 'delete', 'export'],
    alerts: ['create', 'read', 'update', 'delete', 'export'],
    recordings: ['create', 'read', 'update', 'delete', 'export'],
    users: ['create', 'read', 'update', 'delete', 'export'],
    settings: ['create', 'read', 'update', 'delete', 'export'],
    reports: ['create', 'read', 'update', 'delete', 'export'],
  },
  manager: {
    cameras: ['create', 'read', 'update', 'export'],
    alerts: ['create', 'read', 'update', 'export'],
    recordings: ['read', 'export'],
    users: ['read'],
    settings: ['read', 'update'],
    reports: ['create', 'read', 'export'],
  },
  operator: {
    cameras: ['read', 'update'],
    alerts: ['read', 'update'],
    recordings: ['read'],
    users: [],
    settings: ['read'],
    reports: ['read'],
  },
  viewer: {
    cameras: ['read'],
    alerts: ['read'],
    recordings: ['read'],
    users: [],
    settings: [],
    reports: ['read'],
  },
};

class PermissionService {
  private userRole: Permission = 'viewer';

  setRole(role: Permission): void { this.userRole = role; }
  getRole(): Permission { return this.userRole; }

  can(action: Action, resource: Resource): boolean {
    return PERMISSIONS[this.userRole][resource]?.includes(action) ?? false;
  }

  canAny(actions: Action[], resource: Resource): boolean {
    return actions.some(action => this.can(action, resource));
  }

  canAll(actions: Action[], resource: Resource): boolean {
    return actions.every(action => this.can(action, resource));
  }

  getPermissions(): Record<Resource, Action[]> {
    return PERMISSIONS[this.userRole];
  }
}

export const permissionService = new PermissionService();
export default permissionService;
