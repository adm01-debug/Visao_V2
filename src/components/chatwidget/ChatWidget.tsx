import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageCircle, X, Send, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Message { id: string; text: string; sender: 'user' | 'bot'; time: Date; }

interface ChatWidgetProps {
  title?: string;
  placeholder?: string;
  onSend?: (message: string) => void;
  messages?: Message[];
  className?: string;
}

export function ChatWidget({ title = 'Chat', placeholder = 'Digite sua mensagem...', onSend, messages = [], className }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    onSend?.(input);
    setInput('');
  };

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {!open ? (
        <Button size="lg" className="rounded-full w-14 h-14 shadow-lg" onClick={() => setOpen(true)}>
          <MessageCircle className="h-6 w-6" />
        </Button>
      ) : (
        <div className="w-80 bg-card rounded-lg shadow-xl border overflow-hidden">
          <div className="flex items-center justify-between p-3 bg-primary text-primary-foreground">
            <span className="font-medium">{title}</span>
            <div className="flex gap-1">
              <button onClick={() => setOpen(false)}><Minimize2 className="h-4 w-4" /></button>
              <button onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="h-80 overflow-y-auto p-3 space-y-2">
            {messages.map(m => (
              <div key={m.id} className={cn('max-w-[80%] p-2 rounded-lg text-sm', m.sender === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted')}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="p-3 border-t flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={placeholder} className="flex-1 px-3 py-2 rounded-md border text-sm" />
            <Button size="sm" onClick={handleSend}><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatWidget;
