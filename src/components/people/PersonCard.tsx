import { MoreHorizontal, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DbPerson } from './types';

interface PersonCardProps {
  person: DbPerson;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PersonCard({ person, onView, onEdit, onDelete }: PersonCardProps) {
  return (
    <Card className="cursor-pointer hover:shadow-md transition-all group" onClick={onView}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage src={person.photo_url || undefined} />
            <AvatarFallback className="text-lg bg-primary/10">
              {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold truncate">{person.name}</h3>
              <Badge variant={person.is_active ? 'default' : 'secondary'} className="text-xs">
                {person.is_active ? 'Ativo' : 'Inativo'}
              </Badge>
              {person.list_type && person.list_type !== 'none' && (
                <Badge
                  variant={person.list_type === 'blacklist' ? 'destructive' : 'default'}
                  className="text-xs"
                >
                  {person.list_type === 'blacklist' ? 'Blacklist' : person.list_type === 'whitelist' ? 'Whitelist' : 'Watchlist'}
                </Badge>
              )}
            </div>
            {person.role && <p className="text-sm text-muted-foreground truncate">{person.role}</p>}
            {person.department && <p className="text-xs text-muted-foreground mt-1">{person.department}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>
                Cadastrado: {formatDistanceToNow(new Date(person.created_at), { addSuffix: true, locale: ptBR })}
              </span>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(); }}>
                <Eye className="w-4 h-4 mr-2" />Ver detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                <Edit className="w-4 h-4 mr-2" />Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
                <Trash2 className="w-4 h-4 mr-2" />Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
