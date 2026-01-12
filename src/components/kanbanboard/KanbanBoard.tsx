import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Plus, MoreVertical, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Card { id: string; title: string; description?: string; }
interface Column { id: string; title: string; cards: Card[]; }

interface KanbanBoardProps {
  initialColumns?: Column[];
  onColumnsChange?: (columns: Column[]) => void;
  className?: string;
}

export function KanbanBoard({ initialColumns = [], onColumnsChange, className }: KanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>(initialColumns.length ? initialColumns : [
    { id: '1', title: 'A Fazer', cards: [] },
    { id: '2', title: 'Em Progresso', cards: [] },
    { id: '3', title: 'Concluído', cards: [] },
  ]);

  const addCard = (colId: string) => {
    const title = prompt('Título do card:');
    if (!title) return;
    const newCols = columns.map(col => col.id === colId ? { ...col, cards: [...col.cards, { id: Date.now().toString(), title }] } : col);
    setColumns(newCols);
    onColumnsChange?.(newCols);
  };

  return (
    <div className={cn('flex gap-4 overflow-x-auto pb-4', className)}>
      {columns.map(col => (
        <div key={col.id} className="flex-shrink-0 w-72 bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">{col.title}</h3>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">{col.cards.length}</span>
          </div>
          <div className="space-y-2 min-h-[100px]">
            {col.cards.map(card => (
              <div key={card.id} className="p-3 bg-card rounded-lg border shadow-sm cursor-grab">
                <div className="flex items-start gap-2">
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1"><p className="text-sm font-medium">{card.title}</p>{card.description && <p className="text-xs text-muted-foreground mt-1">{card.description}</p>}</div>
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => addCard(col.id)}><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </div>
      ))}
    </div>
  );
}

export default KanbanBoard;
