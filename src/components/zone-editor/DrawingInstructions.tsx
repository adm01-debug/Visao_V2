import { memo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DrawingMode } from './ZoneEditorTypes';

interface DrawingInstructionsProps {
  mode: DrawingMode;
  isDrawing: boolean;
  pointCount: number;
  onCancel: () => void;
}

export const DrawingInstructions = memo(function DrawingInstructions({
  mode, isDrawing, pointCount, onCancel,
}: DrawingInstructionsProps) {
  if (!isDrawing) return null;

  return (
    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-center">
      <div className="bg-foreground/80 text-foreground text-xs px-3 py-2 rounded-lg flex items-center gap-3">
        {mode === 'rectangle' && <span>Clique para definir o segundo canto do retângulo</span>}
        {mode === 'polygon' && (
          <>
            <span>
              {pointCount < 3
                ? 'Clique para adicionar pontos (mín. 3)'
                : 'Clique no primeiro ponto ou duplo-clique para fechar'}
            </span>
            <span className="opacity-60">|</span>
            <span className="opacity-60">ESC para cancelar</span>
          </>
        )}
        {mode === 'line' && <span>Clique para definir o ponto final da linha</span>}
        <Button
          variant="ghost" size="sm"
          className="h-6 px-2 text-foreground hover:bg-background/20"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
        >
          <X className="w-3 h-3 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
});
