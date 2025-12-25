export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Administrador',
  [ROLES.MANAGER]: 'Gerente',
  [ROLES.OPERATOR]: 'Operador',
  [ROLES.VIEWER]: 'Visualizador',
};

export const ROLE_HIERARCHY: Record<Role, number> = {
  [ROLES.ADMIN]: 100,
  [ROLES.MANAGER]: 75,
  [ROLES.OPERATOR]: 50,
  [ROLES.VIEWER]: 25,
};

export const isRoleHigherOrEqual = (userRole: Role, requiredRole: Role): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export default ROLES;
