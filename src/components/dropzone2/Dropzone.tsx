import React from 'react';
import { cn } from '@/lib/utils';
import { Upload, X, File, Image, FileText, Music, Video } from 'lucide-react';

interface DropzoneProps { onDrop: (files: File[]) => void; accept?: string; maxSize?: number; maxFiles?: number; className?: string; }

const getIcon = (type: string) => { if (type.startsWith('image')) return Image; if (type.startsWith('video')) return Video; if (type.startsWith('audio')) return Music; if (type.includes('pdf') || type.includes('document')) return FileText; return File; };

export function Dropzone({ onDrop, accept, maxSize = 10 * 1024 * 1024, maxFiles = 5, className }: DropzoneProps) {
  const [dragOver, setDragOver] = React.useState(false);
  const [files, setFiles] = React.useState<File[]>([]);

  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); const dropped = Array.from(e.dataTransfer.files).slice(0, maxFiles); setFiles(dropped); onDrop(dropped); };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { const selected = Array.from(e.target.files || []).slice(0, maxFiles); setFiles(selected); onDrop(selected); };
  const removeFile = (index: number) => { const newFiles = files.filter((_, i) => i !== index); setFiles(newFiles); onDrop(newFiles); };

  return (
    <div className={cn('space-y-4', className)}>
      <div onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={handleDrop}
        className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-colors', dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50')}>
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="font-medium">Arraste arquivos aqui</p>
        <p className="text-sm text-muted-foreground mb-4">ou clique para selecionar</p>
        <input type="file" multiple accept={accept} onChange={handleChange} className="hidden" id="dropzone-input" />
        <label htmlFor="dropzone-input" className="inline-flex px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer">Selecionar Arquivos</label>
      </div>
      {files.length > 0 && <div className="space-y-2">{files.map((f, i) => { const Icon = getIcon(f.type); return <div key={i} className="flex items-center gap-3 p-3 rounded-lg border"><Icon className="h-5 w-5 text-muted-foreground" /><span className="flex-1 truncate">{f.name}</span><span className="text-sm text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span><button onClick={() => removeFile(i)}><X className="h-4 w-4" /></button></div>; })}</div>}
    </div>
  );
}

export default Dropzone;
