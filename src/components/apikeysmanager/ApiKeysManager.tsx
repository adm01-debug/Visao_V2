import React from 'react';
import { cn } from '@/lib/utils';
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: Date;
  lastUsed?: Date;
  permissions: string[];
}

interface ApiKeysManagerProps {
  keys: ApiKey[];
  onAdd?: () => void;
  onDelete?: (keyId: string) => void;
  onCopy?: (key: string) => void;
  className?: string;
}

export function ApiKeysManager({ keys, onAdd, onDelete, onCopy, className }: ApiKeysManagerProps) {
  const [visibleKeys, setVisibleKeys] = React.useState<Set<string>>(new Set());

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const maskKey = (key: string) => key.slice(0, 8) + '••••••••' + key.slice(-4);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-medium flex items-center gap-2"><Key className="h-4 w-4" />Chaves de API</h4>
        {onAdd && <Button size="sm" onClick={onAdd}><Plus className="h-4 w-4 mr-1" />Nova Chave</Button>}
      </div>
      <div className="space-y-2">
        {keys.map(k => (
          <div key={k.id} className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="flex-1">
              <p className="font-medium text-sm">{k.name}</p>
              <p className="font-mono text-xs text-muted-foreground">{visibleKeys.has(k.id) ? k.key : maskKey(k.key)}</p>
              <p className="text-xs text-muted-foreground mt-1">Criada: {k.createdAt.toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => toggleVisibility(k.id)}>
                {visibleKeys.has(k.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              {onCopy && <Button variant="ghost" size="sm" onClick={() => onCopy(k.key)}><Copy className="h-4 w-4" /></Button>}
              {onDelete && <Button variant="ghost" size="sm" onClick={() => onDelete(k.id)}><Trash2 className="h-4 w-4" /></Button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApiKeysManager;
