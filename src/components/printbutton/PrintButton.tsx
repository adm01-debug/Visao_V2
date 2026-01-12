import React from 'react';
import { cn } from '@/lib/utils';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PrintButtonProps {
  targetId?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function PrintButton({ targetId, label = 'Imprimir', variant = 'outline', size = 'default', className }: PrintButtonProps) {
  const handlePrint = () => {
    if (targetId) {
      const element = document.getElementById(targetId);
      if (element) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write('<html><head><title>Imprimir</title></head><body>');
          printWindow.document.write(element.innerHTML);
          printWindow.document.write('</body></html>');
          printWindow.document.close();
          printWindow.print();
        }
      }
    } else {
      window.print();
    }
  };

  return (
    <Button variant={variant} size={size} onClick={handlePrint} className={className}>
      <Printer className="h-4 w-4 mr-1" />{label}
    </Button>
  );
}

export default PrintButton;
