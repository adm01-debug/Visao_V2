import React from 'react';
import { cn } from '@/lib/utils';
import { Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps { companyName: string; description?: string; links?: { title: string; items: { label: string; href: string }[] }[]; contact?: { email?: string; phone?: string; address?: string }; social?: { type: string; url: string }[]; className?: string; }

export function Footer({ companyName, description, links = [], contact, social = [], className }: FooterProps) {
  return (
    <footer className={cn('bg-muted/30 border-t', className)}>
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div><h3 className="font-bold text-lg mb-4">{companyName}</h3>{description && <p className="text-sm text-muted-foreground">{description}</p>}</div>
          {links.map((section, i) => (
            <div key={i}><h4 className="font-semibold mb-4">{section.title}</h4><ul className="space-y-2">{section.items.map((item, j) => <li key={j}><a href={item.href} className="text-sm text-muted-foreground hover:text-foreground">{item.label}</a></li>)}</ul></div>
          ))}
          {contact && (
            <div><h4 className="font-semibold mb-4">Contato</h4><ul className="space-y-2 text-sm text-muted-foreground">
              {contact.email && <li className="flex items-center gap-2"><Mail className="h-4 w-4" />{contact.email}</li>}
              {contact.phone && <li className="flex items-center gap-2"><Phone className="h-4 w-4" />{contact.phone}</li>}
              {contact.address && <li className="flex items-center gap-2"><MapPin className="h-4 w-4" />{contact.address}</li>}
            </ul></div>
          )}
        </div>
        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {companyName}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
