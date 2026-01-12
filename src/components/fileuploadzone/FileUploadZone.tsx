import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onUpload: (files: File[]) => void;
  className?: string;
}

export function FileUploadZone({ accept, multiple = false, maxSize = 10 * 1024 * 1024, onUpload, className }: FileUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = useCallback((fileList: FileList) => {
    const valid = Array.from(fileList).filter(f => f.size <= maxSize);
    const newFiles = multiple ? [...files, ...valid] : valid.slice(0, 1);
    setFiles(newFiles);
    onUpload(newFiles);
  }, [files, multiple, maxSize, onUpload]);

  const removeFile = (index: number) => { const newFiles = files.filter((_, i) => i !== index); setFiles(newFiles); onUpload(newFiles); };

  return (
    <div className={cn('space-y-3', className)}>
      <div className={cn('border-2 border-dashed rounded-lg p-8 text-center transition-colors', isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25')}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={e => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}>
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-2">Arraste arquivos ou clique para selecionar</p>
        <input type="file" accept={accept} multiple={multiple} onChange={e => e.target.files && handleFiles(e.target.files)} className="hidden" id="file-upload" />
        <label htmlFor="file-upload"><Button variant="outline" asChild><span>Selecionar</span></Button></label>
      </div>
      {files.length > 0 && (
        <ul className="space-y-2">{files.map((f, i) => (
          <li key={i} className="flex items-center gap-2 p-2 rounded bg-muted">
            <File className="h-4 w-4" /><span className="flex-1 text-sm truncate">{f.name}</span>
            <span className="text-xs text-muted-foreground">{(f.size/1024).toFixed(0)} KB</span>
            <button onClick={() => removeFile(i)}><X className="h-4 w-4" /></button>
          </li>
        ))}</ul>
      )}
    </div>
  );
}

export default FileUploadZone;
