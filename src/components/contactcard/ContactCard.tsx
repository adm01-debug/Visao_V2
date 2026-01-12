import React from 'react';
import { cn } from '@/lib/utils';
import { Mail, Phone, MapPin, Globe, MessageCircle } from 'lucide-react';
import { Avatar } from '@/components/media/Avatar';
import { Button } from '@/components/ui/button';

interface ContactCardProps {
  name: string;
  role?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  onMessage?: () => void;
  className?: string;
}

export function ContactCard({ name, role, avatar, email, phone, location, website, onMessage, className }: ContactCardProps) {
  return (
    <div className={cn('p-6 rounded-lg border bg-card text-center', className)}>
      <Avatar src={avatar} name={name} size="lg" className="mx-auto mb-3" />
      <h3 className="font-semibold">{name}</h3>
      {role && <p className="text-sm text-muted-foreground mb-4">{role}</p>}
      <div className="space-y-2 text-sm">
        {email && <a href={`mailto:${email}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"><Mail className="h-4 w-4" />{email}</a>}
        {phone && <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"><Phone className="h-4 w-4" />{phone}</a>}
        {location && <p className="flex items-center justify-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" />{location}</p>}
        {website && <a href={website} target="_blank" className="flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"><Globe className="h-4 w-4" />{website.replace(/https?:\/\//, '')}</a>}
      </div>
      {onMessage && <Button onClick={onMessage} className="mt-4 w-full"><MessageCircle className="h-4 w-4 mr-2" />Enviar Mensagem</Button>}
    </div>
  );
}

export default ContactCard;
