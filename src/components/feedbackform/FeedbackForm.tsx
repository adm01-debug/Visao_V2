import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MessageSquare, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RatingInput } from '@/components/ratinginput/RatingInput';

interface FeedbackFormProps {
  onSubmit: (data: { rating: number; message: string }) => void;
  title?: string;
  placeholder?: string;
  loading?: boolean;
  className?: string;
}

export function FeedbackForm({ onSubmit, title = 'Enviar Feedback', placeholder = 'Conte-nos sua experiência...', loading, className }: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating > 0) onSubmit({ rating, message });
  };

  return (
    <form onSubmit={handleSubmit} className={cn('p-4 rounded-lg border bg-card space-y-4', className)}>
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h4 className="font-medium">{title}</h4>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-2">Como você avalia?</p>
        <RatingInput value={rating} onChange={setRating} size="lg" />
      </div>
      <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={placeholder}
        className="w-full min-h-[100px] p-3 rounded-md border bg-background resize-none" />
      <Button type="submit" disabled={rating === 0 || loading} className="w-full">
        <Send className="h-4 w-4 mr-1" />{loading ? 'Enviando...' : 'Enviar Feedback'}
      </Button>
    </form>
  );
}

export default FeedbackForm;
