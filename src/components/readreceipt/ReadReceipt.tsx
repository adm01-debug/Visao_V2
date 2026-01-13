import React from 'react';import { cn } from '@/lib/utils';import { Check, CheckCheck } from 'lucide-react';interface ReadReceiptProps { status: 'sent' | 'delivered' | 'read'; className?: string; }
const icons = { sent: Check, delivered: CheckCheck, read: CheckCheck }; const colors = { sent: 'text-muted-foreground', delivered: 'text-muted-foreground', read: 'text-blue-500' };
export function ReadReceipt({ status, className }: ReadReceiptProps) { const Icon = icons[status]; return <Icon className={cn('h-4 w-4', colors[status], className)} />; }
export default ReadReceipt;