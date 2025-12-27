export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'export' | 'manage';
export type PermissionResource = 'cameras' | 'alerts' | 'recordings' | 'users' | 'settings' | 'reports';
export type Permission = `${PermissionResource}:${PermissionAction}`;

export interface PermissionCheck { resource: PermissionResource; action: PermissionAction; }
export interface UserPermissions { role: string; permissions: Permission[]; }

export const hasPermission = (userPermissions: Permission[], required: Permission): boolean => userPermissions.includes(required);
export const hasAnyPermission = (userPermissions: Permission[], required: Permission[]): boolean => required.some(p => userPermissions.includes(p));
export const hasAllPermissions = (userPermissions: Permission[], required: Permission[]): boolean => required.every(p => userPermissions.includes(p));
