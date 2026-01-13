import React from 'react';
import { cn } from '@/lib/utils';
import { Calendar, Clock, User, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MeetingCardProps { title: string; date: Date; duration: number; host: string; location?: string; meetingUrl?: string; onJoin?: () => void; className?: string; }

export function MeetingCard({ title, date, duration, host, location, meetingUrl, onJoin, className }: MeetingCardProps) {
  const isNow = new Date() >= date && new Date() <= new Date(date.getTime() + duration * 60000);
  return (
    <div className={cn('p-4 rounded-xl border bg-card', isNow && 'border-green-500 bg-green-50', className)}>
      {isNow && <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full mb-2"><span className="w-2 h-2 bg-white rounded-full animate-pulse" />Ao vivo</span>}
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <div className="space-y-2 text-sm text-muted-foreground mb-4">
        <p className="flex items-center gap-2"><Calendar className="h-4 w-4" />{date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
        <p className="flex items-center gap-2"><Clock className="h-4 w-4" />{date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ({duration}min)</p>
        <p className="flex items-center gap-2"><User className="h-4 w-4" />{host}</p>
        {location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</p>}
      </div>
      {onJoin && <Button className="w-full" onClick={onJoin}>{isNow ? 'Entrar Agora' : 'Ver Detalhes'}</Button>}
    </div>
  );
}

export default MeetingCard;
