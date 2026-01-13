import React from 'react';
import { cn } from '@/lib/utils';

interface LogoCloudProps { logos: { src: string; alt: string }[]; title?: string; grayscale?: boolean; className?: string; }

export function LogoCloud({ logos, title = 'Empresas que confiam em nós', grayscale = true, className }: LogoCloudProps) {
  return (
    <div className={cn('py-12 text-center', className)}>
      {title && <p className="text-sm text-muted-foreground mb-8">{title}</p>}
      <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
        {logos.map((logo, i) => (
          <img key={i} src={logo.src} alt={logo.alt} className={cn('h-8 object-contain', grayscale && 'grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all')} />
        ))}
      </div>
    </div>
  );
}

export default LogoCloud;
