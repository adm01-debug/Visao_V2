import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ThumbsUp, MessageCircle, Flag, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Comment { id: string; author: { name: string; avatar?: string }; content: string; timestamp: Date; likes: number; replies?: Comment[]; }
interface CommentSectionProps { comments: Comment[]; onComment: (content: string, parentId?: string) => void; className?: string; }

function CommentItem({ comment, onReply }: { comment: Comment; onReply: (id: string) => void }) {
  return (
    <div className="flex gap-3">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">{comment.author.avatar ? <img src={comment.author.avatar} className="w-full h-full rounded-full object-cover" /> : comment.author.name[0]}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2"><span className="font-medium text-sm">{comment.author.name}</span><span className="text-xs text-muted-foreground">{comment.timestamp.toLocaleDateString('pt-BR')}</span></div>
        <p className="text-sm mt-1">{comment.content}</p>
        <div className="flex gap-4 mt-2 text-muted-foreground">
          <button className="flex items-center gap-1 text-xs hover:text-primary"><ThumbsUp className="h-3 w-3" />{comment.likes}</button>
          <button className="flex items-center gap-1 text-xs hover:text-primary" onClick={() => onReply(comment.id)}><MessageCircle className="h-3 w-3" />Responder</button>
        </div>
        {comment.replies && <div className="mt-3 space-y-3 pl-4 border-l">{comment.replies.map(r => <CommentItem key={r.id} comment={r} onReply={onReply} />)}</div>}
      </div>
    </div>
  );
}

export function CommentSection({ comments, onComment, className }: CommentSectionProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => { if (content.trim()) { onComment(content); setContent(''); } };

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">U</div>
        <div className="flex-1 flex gap-2">
          <input value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva um comentário..." className="flex-1 px-3 py-2 rounded-lg border text-sm" />
          <Button size="sm" onClick={handleSubmit}><Send className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="space-y-4">{comments.map(c => <CommentItem key={c.id} comment={c} onReply={id => console.log('Reply to', id)} />)}</div>
    </div>
  );
}

export default CommentSection;
