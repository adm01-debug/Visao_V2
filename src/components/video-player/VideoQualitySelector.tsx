import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { StreamQuality } from '@/types/streaming';

const labels: Record<StreamQuality, string> = {
  auto: 'Auto',
  '1080p': '1080p HD',
  '720p': '720p HD',
  '480p': '480p',
  '360p': '360p',
};

export function VideoQualitySelector({
  current,
  available,
  onChange,
}: {
  current: StreamQuality;
  available: StreamQuality[];
  onChange: (q: StreamQuality) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-white hover:bg-white/20">
          <Settings className="w-4 h-4 mr-1" />
          {labels[current]}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuLabel>Qualidade</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {available.map(q => (
          <DropdownMenuItem
            key={q}
            onClick={() => onChange(q)}
            className={cn(q === current && 'bg-primary/10')}
          >
            {labels[q]}
            {q === current && <span className="ml-auto">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
