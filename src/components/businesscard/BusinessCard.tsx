import React from 'react';
import { cn } from '@/lib/utils';
import { Star, MapPin, Phone, Globe, Clock } from 'lucide-react';

interface BusinessCardProps { name: string; rating?: number; reviews?: number; category: string; address?: string; phone?: string; website?: string; hours?: string; image?: string; className?: string; }

export function BusinessCard({ name, rating, reviews, category, address, phone, website, hours, image, className }: BusinessCardProps) {
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      {image && <img src={image} alt="" className="w-full h-32 object-cover" />}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div><h3 className="font-bold">{name}</h3><p className="text-sm text-muted-foreground">{category}</p></div>
          {rating && <div className="flex items-center gap-1 text-sm"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span>{rating}</span><span className="text-muted-foreground">({reviews})</span></div>}
        </div>
        <div className="space-y-2 text-sm">
          {address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground shrink-0" /><span>{address}</span></div>}
          {phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{phone}</span></div>}
          {website && <div className="flex items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><a href={website} className="text-primary hover:underline">{website}</a></div>}
          {hours && <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /><span>{hours}</span></div>}
        </div>
      </div>
    </div>
  );
}

export default BusinessCard;
