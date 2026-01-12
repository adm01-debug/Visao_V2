import React from 'react';
import { cn } from '@/lib/utils';
import { User, Mail, Phone, Building2, Edit } from 'lucide-react';
import { Avatar } from '@/components/media/Avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface UserProfileProps {
  name: string;
  email: string;
  avatar?: string;
  phone?: string;
  department?: string;
  role: 'admin' | 'operator' | 'viewer';
  onEdit?: () => void;
  className?: string;
}

const roleLabels = { admin: 'Administrador', operator: 'Operador', viewer: 'Visualizador' };
const roleColors = { admin: 'destructive', operator: 'default', viewer: 'secondary' } as const;

export function UserProfile({ name, email, avatar, phone, department, role, onEdit, className }: UserProfileProps) {
  return (
    <div className={cn('p-6 rounded-lg border bg-card', className)}>
      <div className="flex items-start gap-4">
        <Avatar src={avatar} name={name} size="lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">{name}</h3>
            <Badge variant={roleColors[role]}>{roleLabels[role]}</Badge>
          </div>
          <div className="space-y-1 mt-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{email}</p>
            {phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{phone}</p>}
            {department && <p className="flex items-center gap-2"><Building2 className="h-4 w-4" />{department}</p>}
          </div>
        </div>
        {onEdit && <Button variant="outline" size="sm" onClick={onEdit}><Edit className="h-4 w-4 mr-1" />Editar</Button>}
      </div>
    </div>
  );
}

export default UserProfile;
