import { LayoutGrid, Grid3X3, List, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type CameraLayout = '2x2' | '3x3' | 'list';

interface CameraLayoutControlsProps {
  layout: CameraLayout;
  onLayoutChange: (layout: CameraLayout) => void;
  onFullscreen?: () => void;
  className?: string;
}

export function CameraLayoutControls({ 
  layout, 
  onLayoutChange, 
  onFullscreen,
  className 
}: CameraLayoutControlsProps) {
  const layouts: { id: CameraLayout; icon: typeof LayoutGrid; label: string }[] = [
    { id: '2x2', icon: LayoutGrid, label: 'Grid 2x2' },
    { id: '3x3', icon: Grid3X3, label: 'Grid 3x3' },
    { id: 'list', icon: List, label: 'Lista' },
  ];

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1 bg-secondary/50 rounded-lg p-1", className)}>
        {layouts.map(({ id, icon: Icon, label }) => (
          <Tooltip key={id}>
            <TooltipTrigger asChild>
              <Button
                variant={layout === id ? 'default' : 'ghost'}
                size="icon"
                className={cn(
                  "h-8 w-8",
                  layout === id && "bg-primary text-primary-foreground"
                )}
                onClick={() => onLayoutChange(id)}
              >
                <Icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
        
        {onFullscreen && (
          <>
            <div className="w-px h-6 bg-border mx-1" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onFullscreen}
                >
                  <Maximize2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Tela cheia</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
