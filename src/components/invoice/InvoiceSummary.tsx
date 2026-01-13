import React from 'react';
import { cn } from '@/lib/utils';
import { FileText, Download, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InvoiceItem { description: string; quantity: number; unitPrice: number; }
interface InvoiceSummaryProps { invoiceNumber: string; date: Date; items: InvoiceItem[]; tax?: number; onDownload?: () => void; onSend?: () => void; className?: string; }

export function InvoiceSummary({ invoiceNumber, date, items, tax = 0, onDownload, onSend, className }: InvoiceSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const taxAmount = subtotal * (tax / 100);
  const total = subtotal + taxAmount;

  return (
    <div className={cn('p-6 rounded-xl border bg-card', className)}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><FileText className="h-5 w-5" /><span className="font-bold">Fatura #{invoiceNumber}</span></div>
        <span className="text-sm text-muted-foreground">{date.toLocaleDateString('pt-BR')}</span>
      </div>
      <div className="space-y-2 mb-4">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between text-sm"><span>{item.description} x{item.quantity}</span><span>R$ {(item.quantity * item.unitPrice).toFixed(2)}</span></div>
        ))}
      </div>
      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
        {tax > 0 && <div className="flex justify-between text-sm"><span>Impostos ({tax}%)</span><span>R$ {taxAmount.toFixed(2)}</span></div>}
        <div className="flex justify-between font-bold"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
      </div>
      <div className="flex gap-2 mt-6">
        <Button variant="outline" className="flex-1" onClick={onDownload}><Download className="h-4 w-4 mr-2" />Download</Button>
        <Button className="flex-1" onClick={onSend}><Send className="h-4 w-4 mr-2" />Enviar</Button>
      </div>
    </div>
  );
}

export default InvoiceSummary;
