import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Globe, Save, TestTube } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WebhookFormData {
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
}

interface WebhookFormProps {
  initialData?: Partial<WebhookFormData>;
  availableEvents: { id: string; label: string }[];
  onSubmit: (data: WebhookFormData) => void;
  onTest?: (url: string) => void;
  className?: string;
}

export function WebhookForm({ initialData, availableEvents, onSubmit, onTest, className }: WebhookFormProps) {
  const [data, setData] = useState<WebhookFormData>({
    url: '', events: [], secret: '', active: true, ...initialData
  });

  const toggleEvent = (eventId: string) => {
    setData(d => ({
      ...d,
      events: d.events.includes(eventId) ? d.events.filter(e => e !== eventId) : [...d.events, eventId]
    }));
  };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(data); }} className={cn('space-y-4', className)}>
      <div>
        <label className="text-sm font-medium">URL do Webhook</label>
        <div className="flex gap-2 mt-1">
          <Input value={data.url} onChange={e => setData(d => ({ ...d, url: e.target.value }))} placeholder="https://..." required />
          {onTest && <Button type="button" variant="outline" onClick={() => onTest(data.url)}><TestTube className="h-4 w-4" /></Button>}
        </div>
      </div>
      <div>
        <label className="text-sm font-medium">Secret (opcional)</label>
        <Input type="password" value={data.secret} onChange={e => setData(d => ({ ...d, secret: e.target.value }))} className="mt-1" />
      </div>
      <div>
        <label className="text-sm font-medium">Eventos</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {availableEvents.map(ev => (
            <label key={ev.id} className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-accent">
              <input type="checkbox" checked={data.events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} />
              <span className="text-sm">{ev.label}</span>
            </label>
          ))}
        </div>
      </div>
      <Button type="submit"><Save className="h-4 w-4 mr-1" />Salvar</Button>
    </form>
  );
}

export default WebhookForm;
