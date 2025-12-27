/**
 * File Upload Zone Component
 * Advanced drag-and-drop file upload with preview
 */

import React, { useState, useCallback, useRef } from 'react';
import { cn } from '@/utils/cn';
import { Upload, X, File, Image, FileText, Film, Music } from 'lucide-react';

export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  progress?: number;
  error?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

export interface FileUploadZoneProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  maxFiles?: number;
  disabled?: boolean;
  showPreview?: boolean;
  onFilesChange?: (files: UploadedFile[]) => void;
  onUpload?: (file: File) => Promise<void>;
  className?: string;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <Image className="h-8 w-8 text-blue-500" />;
  if (type.startsWith('video/')) return <Film className="h-8 w-8 text-purple-500" />;
  if (type.startsWith('audio/')) return <Music className="h-8 w-8 text-green-500" />;
  if (type.includes('pdf') || type.includes('document')) return <FileText className="h-8 w-8 text-red-500" />;
  return <File className="h-8 w-8 text-gray-500" />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  accept,
  multiple = true,
  maxSize = 10 * 1024 * 1024,
  maxFiles = 10,
  disabled = false,
  showPreview = true,
  onFilesChange,
  onUpload,
  className,
}) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < Math.min(fileList.length, maxFiles - files.length); i++) {
      const file = fileList[i];
      
      const uploadedFile: UploadedFile = {
        id: `${Date.now()}-${i}`,
        file,
        status: 'pending',
        progress: 0,
      };

      if (file.size > maxSize) {
        uploadedFile.status = 'error';
        uploadedFile.error = `Arquivo muito grande (máx: ${formatFileSize(maxSize)})`;
      } else if (file.type.startsWith('image/')) {
        uploadedFile.preview = URL.createObjectURL(file);
      }

      newFiles.push(uploadedFile);
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);

    // Auto upload
    if (onUpload) {
      for (const uf of newFiles) {
        if (uf.status === 'pending') {
          try {
            uf.status = 'uploading';
            setFiles([...updatedFiles]);
            await onUpload(uf.file);
            uf.status = 'completed';
            uf.progress = 100;
          } catch (error) {
            uf.status = 'error';
            uf.error = 'Erro ao enviar arquivo';
          }
          setFiles([...updatedFiles]);
          onFilesChange?.(updatedFiles);
        }
      }
    }
  }, [files, maxFiles, maxSize, onFilesChange, onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  }, [disabled, processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  }, [processFiles]);

  const handleRemove = useCallback((id: string) => {
    const file = files.find(f => f.id === id);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange?.(updatedFiles);
  }, [files, onFilesChange]);

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className={cn('file-upload-zone', className)}>
      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <Upload className={cn('h-12 w-12 mx-auto mb-4', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
        
        <p className="text-sm font-medium">
          {isDragOver ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Máximo {maxFiles} arquivos, até {formatFileSize(maxSize)} cada
        </p>
      </div>

      {/* File list */}
      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border',
                file.status === 'error' && 'border-red-500 bg-red-50 dark:bg-red-950'
              )}
            >
              {/* Preview/Icon */}
              {file.preview ? (
                <img src={file.preview} alt="" className="w-12 h-12 object-cover rounded" />
              ) : (
                getFileIcon(file.file.type)
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.file.size)}
                  {file.error && <span className="text-red-500 ml-2">{file.error}</span>}
                </p>

                {/* Progress bar */}
                {file.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Status/Remove */}
              <button
                onClick={(e) => { e.stopPropagation(); handleRemove(file.id); }}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploadZone;
