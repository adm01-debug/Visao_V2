import React from 'react';
import { cn } from '@/lib/utils';
import { Shield } from 'lucide-react';

interface AboutCardProps {
  appName?: string;
  version: string;
  buildDate?: string;
  copyright?: string;
  className?: string;
}

export function AboutCard({ appName = 'VIS-O', version, buildDate, copyright, className }: AboutCardProps) {
  return (
    <div className={cn('p-6 rounded-lg border bg-card text-center', className)}>
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
        <Shield className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold">{appName}</h2>
      <p className="text-sm text-muted-foreground mt-1">Versão {version}</p>
      {buildDate && <p className="text-xs text-muted-foreground mt-1">Build: {buildDate}</p>}
      {copyright && <p className="text-xs text-muted-foreground mt-4">{copyright}</p>}
    </div>
  );
}

export default AboutCard;
