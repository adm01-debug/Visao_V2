import React, { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesChange: (files: File[]) => void;
  className?: string;
}

export function FileUpload({ accept, multiple = false, maxSize = 10 * 1024 * 1024, onFilesChange, className }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const validFiles = Array.from(newFiles).filter(file => file.size <= maxSize);
    const updatedFiles = multiple ? [...files, ...validFiles] : validFiles.slice(0, 1);
    
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated);
  };

  return (
    <div className={className}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files); }}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">Arraste arquivos ou clique para selecionar</p>
        <input ref={inputRef} type="file" accept={accept} multiple={multiple} onChange={(e) => handleFiles(e.target.files)} className="hidden" />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2">
                <File className="h-4 w-4" />
                <span className="text-sm truncate max-w-[200px]">{file.name}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                <X className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default FileUpload;
