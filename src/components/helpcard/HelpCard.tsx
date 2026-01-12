import React from 'react';
import { cn } from '@/lib/utils';
import { HelpCircle, Book, MessageCircle, Phone, ExternalLink } from 'lucide-react';

interface HelpLink {
  icon: 'book' | 'chat' | 'phone';
  label: string;
  href: string;
}

interface HelpCardProps {
  title?: string;
  links: HelpLink[];
  className?: string;
}

const icons = { book: Book, chat: MessageCircle, phone: Phone };

export function HelpCard({ title = 'Ajuda & Suporte', links, className }: HelpCardProps) {
  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-5 w-5 text-primary" />
        <span className="font-medium">{title}</span>
      </div>
      <div className="space-y-2">
        {links.map((link, i) => {
          const Icon = icons[link.icon];
          return (
            <a key={i} href={link.href} target="_blank" rel="noopener"
              className="flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors">
              <Icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">{link.label}</span>
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default HelpCard;
