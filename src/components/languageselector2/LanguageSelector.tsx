import React from 'react';
import { cn } from '@/lib/utils';
import { Languages } from 'lucide-react';

interface LanguageSelectorProps { languages: { code: string; name: string; flag?: string }[]; selected: string; onChange: (code: string) => void; className?: string; }

export function LanguageSelector({ languages, selected, onChange, className }: LanguageSelectorProps) {
  return (
    <div className={cn('relative inline-block', className)}>
      <select value={selected} onChange={e => onChange(e.target.value)} className="appearance-none pl-10 pr-8 py-2 rounded-lg border bg-background text-sm cursor-pointer">
        {languages.map(l => <option key={l.code} value={l.code}>{l.flag} {l.name}</option>)}
      </select>
      <Languages className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  );
}

export default LanguageSelector;
