import React from 'react';
import { cn } from '@/lib/utils';
import { Book, Clock, BarChart, Award } from 'lucide-react';

interface CourseCardProps { title: string; instructor: string; thumbnail?: string; progress?: number; duration?: string; level?: string; rating?: number; onContinue?: () => void; className?: string; }

export function CourseCard({ title, instructor, thumbnail, progress = 0, duration, level, rating, onContinue, className }: CourseCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden group cursor-pointer', className)} onClick={onContinue}>
      <div className="relative"><img src={thumbnail || '/placeholder.jpg'} alt="" className="w-full h-40 object-cover group-hover:scale-105 transition-transform" />{progress > 0 && <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div>}</div>
      <div className="p-4">
        <h3 className="font-bold line-clamp-2 mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-3">{instructor}</p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {duration && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{duration}</span>}
          {level && <span className="flex items-center gap-1"><BarChart className="h-3 w-3" />{level}</span>}
          {rating && <span className="flex items-center gap-1"><Award className="h-3 w-3" />{rating}</span>}
        </div>
        {progress > 0 && <p className="mt-3 text-sm font-medium text-primary">{progress}% concluído</p>}
      </div>
    </div>
  );
}

export default CourseCard;
