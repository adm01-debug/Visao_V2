import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ToastProvider } from './ToastProvider';
import { HelmetProvider } from 'react-helmet-async';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <HelmetProvider>
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  </HelmetProvider>
);
