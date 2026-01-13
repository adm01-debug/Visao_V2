import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Bot, Send, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message { role: 'user' | 'assistant'; content: string; }
interface AIAssistantWidgetProps { onSend?: (message: string) => Promise<string>; title?: string; className?: string; }

export function AIAssistantWidget({ onSend, title = 'Assistente IA', className }: AIAssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput('');
    setMessages(m => [...m, { role: 'user', content: userMsg }]);
    setLoading(true);
    const response = await onSend?.(userMsg) || 'Desculpe, não entendi.';
    setMessages(m => [...m, { role: 'assistant', content: response }]);
    setLoading(false);
  };

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {!open ? (
        <Button onClick={() => setOpen(true)} className="rounded-full w-14 h-14 shadow-lg bg-gradient-to-r from-purple-500 to-pink-500">
          <Sparkles className="h-6 w-6" />
        </Button>
      ) : (
        <div className="w-80 bg-card rounded-lg shadow-xl border overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <div className="flex items-center gap-2"><Bot className="h-5 w-5" /><span className="font-medium">{title}</span></div>
            <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="h-80 overflow-y-auto p-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={cn('max-w-[85%] p-2 rounded-lg text-sm', m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>{m.content}</div>
            ))}
            {loading && <div className="bg-muted p-2 rounded-lg text-sm animate-pulse">Pensando...</div>}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua pergunta..." className="flex-1 px-3 py-2 rounded-lg border text-sm" />
            <Button size="icon" onClick={handleSend} disabled={loading}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIAssistantWidget;
