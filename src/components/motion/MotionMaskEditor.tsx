/**
 * Onda Shinobi 6 — Editor visual de máscaras poligonais.
 * SVG overlay clicável: cliques adicionam vértices, duplo clique finaliza.
 * Coordenadas normalizadas 0..1 (independente da resolução do vídeo).
 */
import { useCallback, useRef, useState } from 'react';
import { X, Undo2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MaskMode, MaskPolygon, MotionMaskInput } from '@/hooks/useMotionMasks';

interface Props {
  cameraId: string;
  previewSrc?: string;
  onSave: (input: MotionMaskInput) => void | Promise<void>;
  onCancel?: () => void;
}

export function MotionMaskEditor({ cameraId, previewSrc, onSave, onCancel }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<MaskPolygon>([]);
  const [name, setName] = useState('Nova máscara');
  const [mode, setMode] = useState<MaskMode>('include');
  const [sensitivity, setSensitivity] = useState(50);

  const addPoint = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPoints((prev) => [...prev, [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]]);
  }, []);

  const undo = () => setPoints((p) => p.slice(0, -1));
  const clear = () => setPoints([]);

  const pathD =
    points.length > 0
      ? `M ${points.map(([x, y]) => `${(x * 100).toFixed(2)},${(y * 100).toFixed(2)}`).join(' L ')} Z`
      : '';

  const color = mode === 'include' ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="mask-name">Nome</Label>
          <Input
            id="mask-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mask-mode">Modo</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as MaskMode)}>
            <SelectTrigger id="mask-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="include">Incluir (só detectar dentro)</SelectItem>
              <SelectItem value="exclude">Excluir (ignorar dentro)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="mask-sens">Sensibilidade: {sensitivity}</Label>
          <input
            id="mask-sens"
            type="range"
            min={0}
            max={100}
            value={sensitivity}
            onChange={(e) => setSensitivity(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      <div className="relative w-full aspect-video bg-muted rounded-lg overflow-hidden border border-border">
        {previewSrc ? (
          <img
            src={previewSrc}
            alt="Preview da câmera"
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Sem preview — clique para desenhar mesmo assim
          </div>
        )}
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full cursor-crosshair"
          onClick={addPoint}
          aria-label="Desenhar polígono da máscara"
        >
          {pathD && (
            <path d={pathD} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={0.4} />
          )}
          {points.map(([x, y], i) => (
            <circle
              key={`${i}-${x}-${y}`}
              cx={x * 100}
              cy={y * 100}
              r={0.8}
              fill={color}
              stroke="hsl(var(--background))"
              strokeWidth={0.2}
            />
          ))}
        </svg>
      </div>

      <div className="flex flex-wrap gap-2 justify-between items-center">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={undo} disabled={points.length === 0}>
            <Undo2 className="w-3.5 h-3.5 mr-1" /> Desfazer
          </Button>
          <Button variant="outline" size="sm" onClick={clear} disabled={points.length === 0}>
            <X className="w-3.5 h-3.5 mr-1" /> Limpar
          </Button>
          <span className="text-xs text-muted-foreground self-center">{points.length} pontos</span>
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            disabled={points.length < 3 || !name.trim()}
            onClick={() =>
              onSave({
                camera_id: cameraId,
                name: name.trim(),
                mode,
                polygon: points,
                sensitivity,
                // eslint-disable-next-line visao/no-hardcoded-colors -- cor da máscara é dado persistido (desenhado no canvas), não tema
                color: mode === 'include' ? '#22c55e' : '#ef4444',
                enabled: true,
              })
            }
          >
            <Save className="w-3.5 h-3.5 mr-1" /> Salvar máscara
          </Button>
        </div>
      </div>
    </div>
  );
}
