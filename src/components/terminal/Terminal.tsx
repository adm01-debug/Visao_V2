import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Terminal as TerminalIcon } from 'lucide-react';

interface TerminalProps { onCommand?: (cmd: string) => string; welcomeMessage?: string; prompt?: string; className?: string; }

export function Terminal({ onCommand, welcomeMessage = 'Terminal VIS-O v1.0', prompt = '$ ', className }: TerminalProps) {
  const [history, setHistory] = useState<{ type: 'input' | 'output'; text: string }[]>([{ type: 'output', text: welcomeMessage }]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [history]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const output = onCommand?.(input) || 'Comando não reconhecido';
    setHistory([...history, { type: 'input', text: prompt + input }, { type: 'output', text: output }]);
    setInput('');
  };

  return (
    <div className={cn('rounded-lg overflow-hidden border bg-black text-green-400 font-mono text-sm', className)}>
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500" /><span className="w-3 h-3 rounded-full bg-yellow-500" /><span className="w-3 h-3 rounded-full bg-green-500" /></div>
        <TerminalIcon className="h-4 w-4" /><span>Terminal</span>
      </div>
      <div className="p-4 h-64 overflow-auto">
        {history.map((h, i) => <div key={i} className={h.type === 'input' ? 'text-white' : ''}>{h.text}</div>)}
        <form onSubmit={handleSubmit} className="flex">
          <span className="text-white">{prompt}</span>
          <input value={input} onChange={e => setInput(e.target.value)} className="flex-1 bg-transparent outline-none text-white" autoFocus />
        </form>
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default Terminal;
