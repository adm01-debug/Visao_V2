/**
 * Onda Shinobi 3 — Editor de Grupo de Monitoramento
 * Dialog para editar nome, layout e seleção ordenada de câmeras.
 * Drag-drop via HTML5 nativo para manter zero-deps.
 */
import { memo, useEffect, useState } from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import {
  LAYOUT_SLOTS,
  type MonitorGroup,
  type MonitorGroupCamera,
  type MonitorLayout,
} from '@/hooks/useMonitorGroups';

const LAYOUTS: MonitorLayout[] = ['1x1', '2x2', '3x3', '4x4', '1+5', '2+8'];

interface CameraOption {
  id: string;
  name: string;
}

interface MonitorGroupEditorProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  group: MonitorGroup | null;
  initialSlots: MonitorGroupCamera[];
  availableCameras: CameraOption[];
  onSave: (patch: {
    name: string;
    layout: MonitorLayout;
    cameraIds: string[];
  }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}

function MonitorGroupEditorImpl({
  open,
  onOpenChange,
  group,
  initialSlots,
  availableCameras,
  onSave,
  onDelete,
}: MonitorGroupEditorProps) {
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<MonitorLayout>('2x2');
  const [selected, setSelected] = useState<string[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(group?.name ?? '');
    setLayout(group?.layout ?? '2x2');
    setSelected(initialSlots.map((s) => s.camera_id));
  }, [open, group, initialSlots]);

  const capacity = LAYOUT_SLOTS[layout];

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 32) return prev;
      return [...prev, id];
    });
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    setSelected((prev) => {
      const arr = [...prev];
      const [m] = arr.splice(from, 1);
      if (m === undefined) return prev;
      arr.splice(to, 0, m);
      return arr;
    });
  };

  const cameraName = (id: string) =>
    availableCameras.find((c) => c.id === id)?.name ?? id.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{group ? 'Editar grupo' : 'Novo grupo'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="mg-name" className="text-xs">Nome</Label>
              <Input
                id="mg-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Fachada"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="mg-layout" className="text-xs">Layout</Label>
              <Select value={layout} onValueChange={(v) => setLayout(v as MonitorLayout)}>
                <SelectTrigger id="mg-layout" aria-label="Layout do grupo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYOUTS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l} · {LAYOUT_SLOTS[l]} slots
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Câmeras disponíveis</Label>
              <ScrollArea className="h-64 rounded-md border p-2">
                <div className="flex flex-col gap-1">
                  {availableCameras.map((c) => {
                    const checked = selected.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          'flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted cursor-pointer',
                          checked && 'bg-muted',
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(c.id)}
                          aria-label={`Selecionar ${c.name}`}
                        />
                        <span className="truncate">{c.name}</span>
                      </label>
                    );
                  })}
                  {availableCameras.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">Nenhuma câmera cadastrada</p>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div>
              <Label className="text-xs">
                Ordem dos slots ({selected.length}/{capacity} · máx. 32)
              </Label>
              <ScrollArea className="h-64 rounded-md border p-2">
                <ol className="flex flex-col gap-1">
                  {selected.map((id, idx) => (
                    <li
                      key={id}
                      draggable
                      onDragStart={() => setDragIdx(idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragIdx !== null) move(dragIdx, idx);
                        setDragIdx(null);
                      }}
                      className={cn(
                        'flex items-center gap-2 rounded border bg-card px-2 py-1 text-sm',
                        idx >= capacity && 'opacity-50 border-dashed',
                      )}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground cursor-grab" />
                      <span className="font-mono text-xs text-muted-foreground w-6">{idx + 1}</span>
                      <span className="flex-1 truncate">{cameraName(id)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => toggle(id)}
                        aria-label={`Remover ${cameraName(id)}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                  {selected.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      Marque câmeras à esquerda para adicionar aqui.
                    </p>
                  )}
                </ol>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {group && onDelete && (
            <Button variant="destructive" onClick={onDelete} className="mr-auto">
              Excluir grupo
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={async () => {
              await onSave({ name, layout, cameraIds: selected });
              onOpenChange(false);
            }}
            disabled={!name.trim()}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const MonitorGroupEditor = memo(MonitorGroupEditorImpl);
