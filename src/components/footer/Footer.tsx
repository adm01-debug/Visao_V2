import React from 'react';
import { cn } from '@/lib/utils';

interface FooterProps {
  copyright?: string;
  links?: { label: string; href: string }[];
  children?: React.ReactNode;
  className?: string;
}

export function Footer({ copyright, links, children, className }: FooterProps) {
  return (
    <footer className={cn('border-t bg-muted/30 py-6', className)}>
      <div className="container mx-auto px-4">
        {children}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {copyright && <p>{copyright}</p>}
          {links && links.length > 0 && (
            <nav className="flex gap-4">
              {links.map((link, i) => (
                <a key={i} href={link.href} className="hover:text-foreground transition-colors">{link.label}</a>
              ))}
            </nav>
          )}
        </div>
      </div>
    </footer>
  );
}

export default Footer;
