import React from 'react';
import { cn } from '@/lib/utils';
import { Globe, ChevronDown } from 'lucide-react';

interface Language { code: string; name: string; flag?: string; }

interface LanguageSelectorProps {
  languages: Language[];
  current: string;
  onChange: (code: string) => void;
  className?: string;
}

export function LanguageSelector({ languages, current, onChange, className }: LanguageSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const currentLang = languages.find(l => l.code === current);

  return (
    <div className={cn('relative', className)}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-accent">
        <Globe className="h-4 w-4" />
        <span className="text-sm">{currentLang?.flag} {currentLang?.name}</span>
        <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 w-full bg-popover border rounded-md shadow-lg z-50">
          {languages.map(lang => (
            <button key={lang.code} onClick={() => { onChange(lang.code); setOpen(false); }}
              className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent', lang.code === current && 'bg-accent')}>
              {lang.flag && <span>{lang.flag}</span>}
              <span>{lang.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default LanguageSelector;
