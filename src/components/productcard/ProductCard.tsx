import React from 'react';
import { cn } from '@/lib/utils';
import { PriceTag } from '@/components/pricetag/PriceTag';
import { Badge } from '@/components/ui/badge';

interface ProductCardProps {
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  badge?: string;
  onClick?: () => void;
  className?: string;
}

export function ProductCard({ name, image, price, originalPrice, badge, onClick, className }: ProductCardProps) {
  return (
    <div onClick={onClick} className={cn('rounded-lg border overflow-hidden bg-card hover:shadow-md transition-shadow', onClick && 'cursor-pointer', className)}>
      <div className="relative aspect-square">
        <img src={image} alt={name} className="w-full h-full object-cover" />
        {badge && <Badge className="absolute top-2 left-2">{badge}</Badge>}
      </div>
      <div className="p-3">
        <h3 className="font-medium line-clamp-2 mb-2">{name}</h3>
        <PriceTag price={price} originalPrice={originalPrice} size="sm" />
      </div>
    </div>
  );
}

export default ProductCard;
