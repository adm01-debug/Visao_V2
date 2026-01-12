import React from 'react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/media/Avatar';
import { Heart, Reply, MoreHorizontal } from 'lucide-react';

interface CommentProps {
  user: { name: string; avatar?: string };
  content: string;
  timestamp: string;
  likes?: number;
  onLike?: () => void;
  onReply?: () => void;
  className?: string;
}

export function Comment({ user, content, timestamp, likes = 0, onLike, onReply, className }: CommentProps) {
  return (
    <div className={cn('flex gap-3', className)}>
      <Avatar src={user.avatar} name={user.name} size="sm" />
      <div className="flex-1">
        <div className="bg-muted rounded-lg px-3 py-2">
          <p className="font-medium text-sm">{user.name}</p>
          <p className="text-sm">{content}</p>
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          <span>{timestamp}</span>
          {onLike && <button onClick={onLike} className="flex items-center gap-1 hover:text-red-500"><Heart className="h-3 w-3" />{likes > 0 && likes}</button>}
          {onReply && <button onClick={onReply} className="flex items-center gap-1 hover:text-primary"><Reply className="h-3 w-3" />Responder</button>}
        </div>
      </div>
    </div>
  );
}

export default Comment;
