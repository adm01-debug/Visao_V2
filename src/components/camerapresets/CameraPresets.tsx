import React from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Preset {
  id: string;
  name: string;
  thumbnail?: string;
}

interface CameraPresetsProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  onAdd?: () => void;
  onEdit?: (preset: Preset) => void;
  onDelete?: (preset: Preset) => void;
  className?: string;
}

export function CameraPresets({ presets, onSelect, onAdd, onEdit, onDelete, className }: CameraPresetsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Presets</h4>
        {onAdd && <Button variant="ghost" size="sm" onClick={onAdd}><Plus className="h-4 w-4" /></Button>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {presets.map(preset => (
          <div key={preset.id} className="relative group">
            <button onClick={() => onSelect(preset)}
              className="w-full aspect-video bg-muted rounded overflow-hidden hover:ring-2 ring-primary transition-all">
              {preset.thumbnail ? (
                <img src={preset.thumbnail} alt={preset.name} className="w-full h-full object-cover" />
              ) : (
                <MapPin className="h-6 w-6 text-muted-foreground mx-auto mt-4" />
              )}
            </button>
            <p className="text-xs text-center mt-1 truncate">{preset.name}</p>
            {(onEdit || onDelete) && (
              <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1">
                {onEdit && <button onClick={() => onEdit(preset)} className="p-1 bg-black/70 rounded"><Edit className="h-3 w-3 text-white" /></button>}
                {onDelete && <button onClick={() => onDelete(preset)} className="p-1 bg-black/70 rounded"><Trash2 className="h-3 w-3 text-white" /></button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default CameraPresets;
