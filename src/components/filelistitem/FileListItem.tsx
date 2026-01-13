import React from 'react';
import { cn } from '@/lib/utils';
import { Folder, File, ChevronRight, MoreHorizontal } from 'lucide-react';

interface FileListItemProps { name: string; type: 'file' | 'folder'; size?: string; modified?: Date; selected?: boolean; onClick?: () => void; className?: string; }

export function FileListItem({ name, type, size, modified, selected, onClick, className }: FileListItemProps) {
  const Icon = type === 'folder' ? Folder : File;
  return (
    <div onClick={onClick} className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer', selected ? 'bg-primary/10' : 'hover:bg-accent', className)}>
      <Icon className={cn('h-5 w-5', type === 'folder' ? 'text-yellow-500' : 'text-blue-500')} />
      <span className="flex-1 truncate">{name}</span>
      {size && <span className="text-sm text-muted-foreground">{size}</span>}
      {modified && <span className="text-sm text-muted-foreground">{modified.toLocaleDateString('pt-BR')}</span>}
      <button className="p-1 hover:bg-accent rounded"><MoreHorizontal className="h-4 w-4" /></button>
    </div>
  );
}

export default FileListItem;
