import React from 'react';
import { cn } from '@/lib/utils';
import { ShoppingCart, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProductCardProps { name: string; price: number; originalPrice?: number; image: string; rating?: number; reviews?: number; onAddToCart?: () => void; onFavorite?: () => void; className?: string; }

export function ProductCard({ name, price, originalPrice, image, rating, reviews, onAddToCart, onFavorite, className }: ProductCardProps) {
  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden group', className)}>
      <div className="relative">
        <img src={image} alt="" className="w-full aspect-square object-cover group-hover:scale-105 transition-transform" />
        {discount > 0 && <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">-{discount}%</span>}
        <button onClick={onFavorite} className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white"><Heart className="h-4 w-4" /></button>
      </div>
      <div className="p-4">
        <h3 className="font-medium line-clamp-2 mb-2">{name}</h3>
        {rating && <div className="flex items-center gap-1 mb-2"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-sm">{rating}</span><span className="text-xs text-muted-foreground">({reviews})</span></div>}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold">R$ {price.toFixed(2)}</span>
          {originalPrice && <span className="text-sm text-muted-foreground line-through">R$ {originalPrice.toFixed(2)}</span>}
        </div>
        <Button className="w-full" onClick={onAddToCart}><ShoppingCart className="h-4 w-4 mr-2" />Adicionar</Button>
      </div>
    </div>
  );
}

export default ProductCard;
