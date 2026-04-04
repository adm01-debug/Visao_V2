import { MoreHorizontal, Trash2, Edit, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import type { DbPerson } from './types';

interface PeopleListViewProps {
  people: DbPerson[];
  onView: (person: DbPerson) => void;
  onEdit: (person: DbPerson) => void;
  onDelete: (person: DbPerson) => void;
}

export function PeopleListView({ people, onView, onEdit, onDelete }: PeopleListViewProps) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pessoa</TableHead>
            <TableHead>Departamento</TableHead>
            <TableHead>Cargo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cadastrado</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {people.map(person => (
            <TableRow key={person.id} className="cursor-pointer" onClick={() => onView(person)}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={person.photo_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {person.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{person.name}</span>
                </div>
              </TableCell>
              <TableCell>{person.department || '-'}</TableCell>
              <TableCell>{person.role || '-'}</TableCell>
              <TableCell>
                <Badge variant={person.is_active ? 'default' : 'secondary'}>
                  {person.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{format(new Date(person.created_at), 'dd/MM/yy')}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(person); }}>
                      <Eye className="w-4 h-4 mr-2" />Ver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(person); }}>
                      <Edit className="w-4 h-4 mr-2" />Editar
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(person); }}>
                      <Trash2 className="w-4 h-4 mr-2" />Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
