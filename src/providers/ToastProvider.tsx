import { Toaster } from '@/components/ui/toaster';
import { ReactNode } from 'react';
export const ToastProvider = ({ children }: { children: ReactNode }) => (<>{children}<Toaster /></>);
