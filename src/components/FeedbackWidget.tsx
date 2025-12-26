/**
 * Feedback Widget
 */
import React, { useState } from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown, Send, X } from 'lucide-react';
export const FeedbackWidget: React.FC<{ onSubmit?: (feedback: { type: string; message: string; rating?: number }) => void }> = ({ onSubmit }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'bug' | 'feature' | 'other'>('other');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const handleSubmit = () => { onSubmit?.({ type, message, rating: rating ?? undefined }); setMessage(''); setRating(null); setIsOpen(false); };
  return (
    <>
      <button onClick={() => setIsOpen(true)} className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform"><MessageSquare className="h-5 w-5" /></button>
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-80 bg-background border rounded-lg shadow-xl p-4 z-50">
          <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Enviar Feedback</h3><button onClick={() => setIsOpen(false)}><X className="h-5 w-5" /></button></div>
          <div className="flex gap-2 mb-3">{(['bug', 'feature', 'other'] as const).map(t => (<button key={t} onClick={() => setType(t)} className={`px-3 py-1 rounded text-sm ${type === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t === 'bug' ? 'Bug' : t === 'feature' ? 'Sugestão' : 'Outro'}</button>))}</div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Descreva seu feedback..." className="w-full h-24 p-2 border rounded resize-none" />
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-2"><button onClick={() => setRating(1)} className={`p-2 rounded ${rating === 1 ? 'bg-green-100' : 'hover:bg-muted'}`}><ThumbsUp className="h-5 w-5" /></button><button onClick={() => setRating(-1)} className={`p-2 rounded ${rating === -1 ? 'bg-red-100' : 'hover:bg-muted'}`}><ThumbsDown className="h-5 w-5" /></button></div>
            <button onClick={handleSubmit} disabled={!message} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded disabled:opacity-50"><Send className="h-4 w-4" />Enviar</button>
          </div>
        </div>
      )}
    </>
  );
};
export default FeedbackWidget;
