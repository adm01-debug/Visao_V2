import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: 'ok' | 'warn' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-destructive'
      : tone === 'warn'
        ? 'text-warning'
        : tone === 'ok'
          ? 'text-success'
          : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={cn('text-xl font-bold mt-0.5 tabular-nums', toneClass)}>{value}</p>
        </div>
        <div
          className={cn(
            'w-8 h-8 rounded-full bg-muted flex items-center justify-center',
            toneClass
          )}
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

export function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground uppercase text-[10px] tracking-wide">{label}</p>
      <p className="font-medium text-foreground mt-0.5 truncate">{value}</p>
    </div>
  );
}
