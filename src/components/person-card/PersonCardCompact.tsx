import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Person, getListTypeColor, getListTypeLabel } from '@/types/faceRecognition';

interface PersonCardCompactProps {
  person: Person;
  selected?: boolean;
  onSelect?: (personId: string) => void;
  className?: string;
}

export function PersonCardCompact({ person, selected, onSelect, className }: PersonCardCompactProps) {
  const initials = person.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer',
        'hover:bg-accent/50',
        selected && 'bg-accent ring-2 ring-primary',
        className
      )}
      onClick={() => onSelect?.(person.id)}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={person.photoUrl} alt={person.name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{person.name}</span>
          <Badge className={cn('text-foreground border-0 text-xs', getListTypeColor(person.listType))}>
            {getListTypeLabel(person.listType)}
          </Badge>
        </div>
        {person.company && <p className="text-xs text-muted-foreground truncate">{person.company}</p>}
      </div>
      {person.status === 'blocked' && <Ban className="w-4 h-4 text-destructive" />}
    </div>
  );
}
