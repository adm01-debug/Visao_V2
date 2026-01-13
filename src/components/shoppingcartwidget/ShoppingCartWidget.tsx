import React from 'react';
import { cn } from '@/lib/utils';
import { ShoppingBag, Trash2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CartItem { id: string; name: string; price: number; quantity: number; image: string; }
interface ShoppingCartWidgetProps { items: CartItem[]; onUpdateQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void; onCheckout: () => void; className?: string; }

export function ShoppingCartWidget({ items, onUpdateQuantity, onRemove, onCheckout, className }: ShoppingCartWidgetProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className={cn('p-4 rounded-xl border bg-card', className)}>
      <h3 className="font-bold flex items-center gap-2 mb-4"><ShoppingBag className="h-5 w-5" />Carrinho ({items.length})</h3>
      <div className="space-y-4 max-h-80 overflow-auto">
        {items.map(item => (
          <div key={item.id} className="flex gap-3">
            <img src={item.image} alt="" className="w-16 h-16 rounded object-cover" />
            <div className="flex-1">
              <p className="font-medium text-sm line-clamp-1">{item.name}</p>
              <p className="text-sm text-muted-foreground">R$ {item.price.toFixed(2)}</p>
              <div className="flex items-center gap-2 mt-1">
                <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}><Minus className="h-4 w-4" /></button>
                <span className="text-sm w-6 text-center">{item.quantity}</span>
                <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}><Plus className="h-4 w-4" /></button>
              </div>
            </div>
            <button onClick={() => onRemove(item.id)} className="text-red-500"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <div className="border-t mt-4 pt-4">
        <div className="flex justify-between mb-4"><span className="font-medium">Total</span><span className="font-bold">R$ {total.toFixed(2)}</span></div>
        <Button className="w-full" onClick={onCheckout}>Finalizar Compra</Button>
      </div>
    </div>
  );
}

export default ShoppingCartWidget;
