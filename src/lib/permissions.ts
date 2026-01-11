/**
 * Permissions utilities
 */

export type Permission = "read" | "write" | "delete" | "admin";

export interface PermissionSet {
  [resource: string]: Permission[];
}

export function hasPermission(permissions: PermissionSet, resource: string, action: Permission): boolean {
  return permissions[resource]?.includes(action) || permissions["*"]?.includes("admin") || false;
}

export function canRead(permissions: PermissionSet, resource: string): boolean {
  return hasPermission(permissions, resource, "read");
}

export function canWrite(permissions: PermissionSet, resource: string): boolean {
  return hasPermission(permissions, resource, "write");
}

export function canDelete(permissions: PermissionSet, resource: string): boolean {
  return hasPermission(permissions, resource, "delete");
}

export function isAdmin(permissions: PermissionSet): boolean {
  return permissions["*"]?.includes("admin") || false;
}

export default { hasPermission, canRead, canWrite, canDelete, isAdmin };

