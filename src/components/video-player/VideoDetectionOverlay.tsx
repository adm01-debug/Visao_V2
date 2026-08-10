import { cn } from '@/lib/utils';
import type { Detection } from './types';

const severityColors = {
  low: 'border-primary bg-primary/10',
  medium: 'border-warning bg-warning/10',
  high: 'border-warning bg-warning/15',
  critical: 'border-destructive bg-destructive/10 animate-pulse',
};

const typeColors = {
  person: 'border-primary',
  vehicle: 'border-accent',
  object: 'border-primary/70',
  zone: 'border-dashed border-destructive',
};

export function VideoDetectionOverlay({ detections }: { detections: Detection[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {detections.map((det) => (
        <div
          key={det.id}
          className={cn(
            'absolute border-2 rounded-sm transition-all duration-200',
            det.severity ? severityColors[det.severity] : typeColors[det.type]
          )}
          style={{
            left: `${det.boundingBox.x}%`,
            top: `${det.boundingBox.y}%`,
            width: `${det.boundingBox.width}%`,
            height: `${det.boundingBox.height}%`,
          }}
        >
          <div className="absolute -top-6 left-0 bg-background/90 backdrop-blur-sm text-foreground text-xs px-2 py-0.5 rounded whitespace-nowrap">
            {det.label}
            {det.confidence < 1 && (
              <span className="ml-1 text-muted-foreground">
                {Math.round(det.confidence * 100)}%
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
