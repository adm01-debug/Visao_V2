/**
 * VISÃO - Heatmap Header with filters
 */
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Thermometer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeatmapHeaderProps {
  cameras: { id: string; name: string }[];
  selectedCamera: string;
  setSelectedCamera: (v: string) => void;
  period: string;
  setPeriod: (v: '1h' | '6h' | '24h' | '7d') => void;
  loading: boolean;
  onRefresh: () => void;
}

export function HeatmapHeader({
  cameras,
  selectedCamera,
  setSelectedCamera,
  period,
  setPeriod,
  loading,
  onRefresh,
}: HeatmapHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Thermometer className="h-6 w-6 text-primary" />
        <div>
          <h2 className="text-xl font-bold">Mapa de Calor</h2>
          <p className="text-sm text-muted-foreground">Visualização de movimentação por zona</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Select value={selectedCamera} onValueChange={setSelectedCamera}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Câmera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {cameras.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={period}
          onValueChange={(v: string) => setPeriod(v as '1h' | '6h' | '24h' | '7d')}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">1 hora</SelectItem>
            <SelectItem value="6h">6 horas</SelectItem>
            <SelectItem value="24h">24 horas</SelectItem>
            <SelectItem value="7d">7 dias</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={onRefresh} aria-label="Atualizar">
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
        </Button>
      </div>
    </div>
  );
}
