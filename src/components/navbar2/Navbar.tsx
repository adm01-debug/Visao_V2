import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Menu, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavItem { label: string; href?: string; children?: { label: string; href: string }[]; }
interface NavbarProps { logo: React.ReactNode; items: NavItem[]; cta?: { label: string; onClick: () => void }; className?: string; }

export function Navbar({ logo, items, cta, className }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className={cn('sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b', className)}>
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          {logo}
          <div className="hidden md:flex items-center gap-6">
            {items.map((item, i) => (
              <div key={i} className="relative group">
                {item.children ? (
                  <button className="flex items-center gap-1 text-sm hover:text-primary">{item.label}<ChevronDown className="h-4 w-4" /></button>
                ) : (
                  <a href={item.href} className="text-sm hover:text-primary">{item.label}</a>
                )}
                {item.children && (
                  <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    <div className="bg-popover border rounded-lg shadow-lg py-2 min-w-[180px]">
                      {item.children.map((child, j) => <a key={j} href={child.href} className="block px-4 py-2 text-sm hover:bg-accent">{child.label}</a>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {cta && <Button className="hidden md:inline-flex" onClick={cta.onClick}>{cta.label}</Button>}
          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
