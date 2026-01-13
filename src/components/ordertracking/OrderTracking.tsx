import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Package, Truck, MapPin } from 'lucide-react';

interface TrackingStep { status: string; date: Date; location?: string; completed: boolean; }
interface OrderTrackingProps { orderNumber: string; steps: TrackingStep[]; className?: string; }

const statusIcons: Record<string, typeof CheckCircle> = { confirmed: CheckCircle, processing: Package, shipped: Truck, delivered: MapPin };

export function OrderTracking({ orderNumber, steps, className }: OrderTrackingProps) {
  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold">Rastrear Pedido</h3>
        <span className="text-sm text-muted-foreground">#{orderNumber}</span>
      </div>
      <div className="space-y-4">
        {steps.map((step, i) => {
          const Icon = statusIcons[step.status.toLowerCase()] || CheckCircle;
          return (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', step.completed ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  <Icon className="h-5 w-5" />
                </div>
                {i < steps.length - 1 && <div className={cn('w-0.5 flex-1 my-2', step.completed ? 'bg-primary' : 'bg-muted')} />}
              </div>
              <div className="pb-4">
                <p className="font-medium">{step.status}</p>
                <p className="text-sm text-muted-foreground">{step.date.toLocaleString('pt-BR')}</p>
                {step.location && <p className="text-sm text-muted-foreground">{step.location}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OrderTracking;
