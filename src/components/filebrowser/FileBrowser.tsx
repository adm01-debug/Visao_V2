import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react';

interface FileNode { name: string; type: 'file' | 'folder'; children?: FileNode[]; }
interface FileBrowserProps { files: FileNode[]; onSelect?: (file: FileNode) => void; className?: string; }

function FileItem({ node, level, onSelect }: { node: FileNode; level: number; onSelect?: (f: FileNode) => void }) {
  const [open, setOpen] = useState(false);
  const isFolder = node.type === 'folder';

  return (
    <div>
      <button onClick={() => { isFolder ? setOpen(!open) : onSelect?.(node); }}
        className="w-full flex items-center gap-2 px-2 py-1 hover:bg-accent rounded" style={{ paddingLeft: level * 16 + 8 }}>
        {isFolder ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="w-4" />}
        {isFolder ? <Folder className="h-4 w-4 text-yellow-500" /> : <File className="h-4 w-4 text-muted-foreground" />}
        <span className="text-sm">{node.name}</span>
      </button>
      {open && node.children?.map((child, i) => <FileItem key={i} node={child} level={level + 1} onSelect={onSelect} />)}
    </div>
  );
}

export function FileBrowser({ files, onSelect, className }: FileBrowserProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-2', className)}>
      {files.map((file, i) => <FileItem key={i} node={file} level={0} onSelect={onSelect} />)}
    </div>
  );
}

export default FileBrowser;
