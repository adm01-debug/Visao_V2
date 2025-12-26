/**
 * Kanban Board Component
 * Drag-and-drop board for task management
 */

import React, { useState, useCallback } from 'react';
import { cn } from '@/utils/cn';
import { Plus, MoreHorizontal, GripVertical } from 'lucide-react';

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  labels?: { id: string; name: string; color: string }[];
  assignees?: { id: string; name: string; avatar?: string }[];
  dueDate?: Date;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  comments?: number;
  attachments?: number;
  data?: Record<string, unknown>;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  color?: string;
  limit?: number;
}

export interface KanbanProps {
  columns: KanbanColumn[];
  onCardMove?: (cardId: string, sourceColumn: string, targetColumn: string, targetIndex: number) => void;
  onCardClick?: (card: KanbanCard, column: KanbanColumn) => void;
  onCardAdd?: (column: KanbanColumn) => void;
  onCardEdit?: (card: KanbanCard, column: KanbanColumn) => void;
  onCardDelete?: (card: KanbanCard, column: KanbanColumn) => void;
  onColumnAdd?: () => void;
  onColumnEdit?: (column: KanbanColumn) => void;
  onColumnDelete?: (column: KanbanColumn) => void;
  renderCard?: (card: KanbanCard, column: KanbanColumn) => React.ReactNode;
  className?: string;
  columnClassName?: string;
  cardClassName?: string;
  allowAddColumn?: boolean;
  allowAddCard?: boolean;
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const KanbanCardComponent: React.FC<{
  card: KanbanCard;
  column: KanbanColumn;
  onCardClick?: (card: KanbanCard, column: KanbanColumn) => void;
  onDragStart: (e: React.DragEvent, cardId: string) => void;
  className?: string;
}> = ({ card, column, onCardClick, onDragStart, className }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, card.id)}
      onClick={() => onCardClick?.(card, column)}
      className={cn(
        'group bg-card border rounded-lg p-3 cursor-pointer transition-all',
        'hover:shadow-md hover:border-primary/50',
        'active:cursor-grabbing',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        <div className="flex-1 min-w-0">
          {/* Labels */}
          {card.labels && card.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {card.labels.map((label) => (
                <span
                  key={label.id}
                  className="px-2 py-0.5 text-xs rounded-full"
                  style={{ backgroundColor: label.color, color: '#fff' }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h4 className="text-sm font-medium truncate">{card.title}</h4>

          {/* Description */}
          {card.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {card.description}
            </p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-2">
            {/* Priority */}
            {card.priority && (
              <span className={cn('px-1.5 py-0.5 text-xs rounded', PRIORITY_COLORS[card.priority])}>
                {card.priority}
              </span>
            )}

            {/* Due date */}
            {card.dueDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(card.dueDate).toLocaleDateString()}
              </span>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Comments */}
            {card.comments !== undefined && card.comments > 0 && (
              <span className="text-xs text-muted-foreground">
                💬 {card.comments}
              </span>
            )}

            {/* Attachments */}
            {card.attachments !== undefined && card.attachments > 0 && (
              <span className="text-xs text-muted-foreground">
                📎 {card.attachments}
              </span>
            )}

            {/* Assignees */}
            {card.assignees && card.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {card.assignees.slice(0, 3).map((assignee) => (
                  <div
                    key={assignee.id}
                    className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
                    title={assignee.name}
                  >
                    {assignee.avatar ? (
                      <img src={assignee.avatar} alt={assignee.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      assignee.name.charAt(0).toUpperCase()
                    )}
                  </div>
                ))}
                {card.assignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs border-2 border-background">
                    +{card.assignees.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const Kanban: React.FC<KanbanProps> = ({
  columns,
  onCardMove,
  onCardClick,
  onCardAdd,
  onCardEdit,
  onCardDelete,
  onColumnAdd,
  onColumnEdit,
  onColumnDelete,
  renderCard,
  className,
  columnClassName,
  cardClassName,
  allowAddColumn = true,
  allowAddCard = true,
}) => {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, cardId: string) => {
    setDraggedCard(cardId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', cardId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(columnId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetColumnId: string) => {
    e.preventDefault();
    setDragOverColumn(null);

    if (!draggedCard) return;

    // Find source column
    const sourceColumn = columns.find(col => 
      col.cards.some(card => card.id === draggedCard)
    );

    if (!sourceColumn) return;

    // Don't do anything if dropping in the same column at the same position
    if (sourceColumn.id === targetColumnId) return;

    // Get target index (last position for now)
    const targetColumn = columns.find(col => col.id === targetColumnId);
    if (!targetColumn) return;

    onCardMove?.(draggedCard, sourceColumn.id, targetColumnId, targetColumn.cards.length);
    setDraggedCard(null);
  }, [draggedCard, columns, onCardMove]);

  const handleDragEnd = useCallback(() => {
    setDraggedCard(null);
    setDragOverColumn(null);
  }, []);

  return (
    <div className={cn('kanban-board flex gap-4 overflow-x-auto p-4', className)}>
      {columns.map((column) => (
        <div
          key={column.id}
          className={cn(
            'kanban-column flex-shrink-0 w-72 bg-muted/30 rounded-lg',
            dragOverColumn === column.id && 'ring-2 ring-primary',
            columnClassName
          )}
          onDragOver={(e) => handleDragOver(e, column.id)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          {/* Column Header */}
          <div className="p-3 border-b flex items-center gap-2">
            {column.color && (
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: column.color }}
              />
            )}
            <h3 className="font-semibold flex-1">{column.title}</h3>
            <span className="text-sm text-muted-foreground">
              {column.cards.length}
              {column.limit && `/${column.limit}`}
            </span>
            <button
              onClick={() => onColumnEdit?.(column)}
              className="p-1 rounded hover:bg-accent"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Cards */}
          <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-200px)] overflow-y-auto">
            {column.cards.map((card) => (
              renderCard ? (
                <div key={card.id} draggable onDragStart={(e) => handleDragStart(e, card.id)}>
                  {renderCard(card, column)}
                </div>
              ) : (
                <KanbanCardComponent
                  key={card.id}
                  card={card}
                  column={column}
                  onCardClick={onCardClick}
                  onDragStart={handleDragStart}
                  className={cardClassName}
                />
              )
            ))}

            {/* Add card button */}
            {allowAddCard && (
              <button
                onClick={() => onCardAdd?.(column)}
                className={cn(
                  'w-full p-2 rounded-lg border-2 border-dashed border-muted-foreground/30',
                  'text-muted-foreground text-sm',
                  'hover:border-primary hover:text-primary transition-colors',
                  'flex items-center justify-center gap-2'
                )}
              >
                <Plus className="h-4 w-4" />
                Adicionar cartão
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Add column button */}
      {allowAddColumn && (
        <button
          onClick={onColumnAdd}
          className={cn(
            'flex-shrink-0 w-72 min-h-[200px] rounded-lg',
            'border-2 border-dashed border-muted-foreground/30',
            'text-muted-foreground',
            'hover:border-primary hover:text-primary transition-colors',
            'flex items-center justify-center gap-2'
          )}
        >
          <Plus className="h-5 w-5" />
          Adicionar coluna
        </button>
      )}
    </div>
  );
};

export default Kanban;
