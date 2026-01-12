import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description?: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
}

interface PermissionMatrixProps {
  permissions: Permission[];
  roles: Role[];
  onToggle?: (roleId: string, permissionId: string, enabled: boolean) => void;
  className?: string;
}

export function PermissionMatrix({ permissions, roles, onToggle, className }: PermissionMatrixProps) {
  return (
    <div className={cn('overflow-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3 font-medium">Permissão</th>
            {roles.map(role => <th key={role.id} className="text-center p-3 font-medium">{role.name}</th>)}
          </tr>
        </thead>
        <tbody>
          {permissions.map(perm => (
            <tr key={perm.id} className="border-b">
              <td className="p-3">
                <p className="font-medium">{perm.name}</p>
                {perm.description && <p className="text-xs text-muted-foreground">{perm.description}</p>}
              </td>
              {roles.map(role => {
                const hasPermission = role.permissions.includes(perm.id);
                return (
                  <td key={role.id} className="text-center p-3">
                    <button onClick={() => onToggle?.(role.id, perm.id, !hasPermission)}
                      className={cn('w-8 h-8 rounded-full flex items-center justify-center', hasPermission ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
                      {hasPermission ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PermissionMatrix;
