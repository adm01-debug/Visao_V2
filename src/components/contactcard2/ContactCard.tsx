import React from 'react';
import { cn } from '@/lib/utils';
import { Mail, Phone, MapPin, Calendar, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContactCardProps { name: string; email?: string; phone?: string; location?: string; lastContact?: Date; avatar?: string; onEdit?: () => void; className?: string; }

export function ContactCard({ name, email, phone, location, lastContact, avatar, onEdit, className }: ContactCardProps) {
  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold shrink-0">
          {avatar ? <img src={avatar} className="w-full h-full rounded-full object-cover" /> : name[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between"><h3 className="font-bold text-lg">{name}</h3><Button variant="ghost" size="icon" onClick={onEdit}><Edit className="h-4 w-4" /></Button></div>
          <div className="space-y-1 mt-2 text-sm">
            {email && <p className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" />{email}</p>}
            {phone && <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" />{phone}</p>}
            {location && <p className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{location}</p>}
            {lastContact && <p className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />Último contato: {lastContact.toLocaleDateString('pt-BR')}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ContactCard;
