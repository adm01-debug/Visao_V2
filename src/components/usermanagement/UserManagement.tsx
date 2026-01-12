import React from 'react';
import { cn } from '@/lib/utils';
import { User, Shield, Edit, Trash2, Plus } from 'lucide-react';
import { Avatar } from '@/components/media/Avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserItem {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'operator' | 'viewer';
  active: boolean;
}

interface UserManagementProps {
  users: UserItem[];
  onEdit?: (user: UserItem) => void;
  onDelete?: (user: UserItem) => void;
  onAdd?: () => void;
  className?: string;
}

const roleLabels = { admin: 'Admin', operator: 'Operador', viewer: 'Visualizador' };
const roleColors = { admin: 'destructive', operator: 'default', viewer: 'secondary' } as const;

export function UserManagement({ users, onEdit, onDelete, onAdd, className }: UserManagementProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Usuários</h3>
        {onAdd && <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Novo</Button>}
      </div>
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className={cn('flex items-center gap-3 p-3 rounded-lg border', !user.active && 'opacity-50')}>
            <Avatar src={user.avatar} name={user.name} size="sm" />
            <div className="flex-1">
              <p className="font-medium text-sm">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Badge variant={roleColors[user.role]}>{roleLabels[user.role]}</Badge>
            <div className="flex gap-1">
              {onEdit && <Button size="sm" variant="ghost" onClick={() => onEdit(user)}><Edit className="h-4 w-4" /></Button>}
              {onDelete && <Button size="sm" variant="ghost" onClick={() => onDelete(user)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default UserManagement;
