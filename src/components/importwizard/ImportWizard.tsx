import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Upload, FileText, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ImportWizardProps {
  accept?: string;
  onImport: (file: File) => Promise<{ success: boolean; message: string }>;
  className?: string;
}

export function ImportWizard({ accept = '.csv,.json,.xml', onImport, className }: ImportWizardProps) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setStatus('uploading');
    try {
      const result = await onImport(file);
      setStatus(result.success ? 'success' : 'error');
      setMessage(result.message);
    } catch (err) { setStatus('error'); setMessage('Erro ao importar'); }
  };

  return (
    <div className={cn('p-6 rounded-lg border bg-card', className)}>
      <div className="text-center mb-4">
        <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
        <h3 className="font-medium">Importar Dados</h3>
        <p className="text-sm text-muted-foreground">Arraste ou selecione um arquivo</p>
      </div>
      <input type="file" accept={accept} onChange={handleFileChange} className="hidden" id="import-file" />
      <label htmlFor="import-file" className="block w-full p-4 border-2 border-dashed rounded-lg text-center cursor-pointer hover:bg-muted/50 mb-4">
        {file ? <><FileText className="h-6 w-6 mx-auto mb-1" /><span className="text-sm">{file.name}</span></> : <span className="text-sm text-muted-foreground">Clique para selecionar</span>}
      </label>
      {status !== 'idle' && (
        <div className={cn('flex items-center gap-2 p-3 rounded mb-4', status === 'success' ? 'bg-green-50 text-green-700' : status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700')}>
          {status === 'success' ? <Check className="h-4 w-4" /> : status === 'error' ? <AlertCircle className="h-4 w-4" /> : null}
          <span className="text-sm">{message || 'Processando...'}</span>
        </div>
      )}
      <Button onClick={handleImport} disabled={!file || status === 'uploading'} className="w-full">
        {status === 'uploading' ? 'Importando...' : 'Importar'}
      </Button>
    </div>
  );
}

export default ImportWizard;
