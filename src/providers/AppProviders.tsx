import { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { ToastProvider } from './ToastProvider';
import { FilterPersistenceProvider } from './FilterPersistenceProvider';
import { HelmetProvider } from 'react-helmet-async';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <HelmetProvider>
    <QueryProvider>
      <ToastProvider>
        <FilterPersistenceProvider>{children}</FilterPersistenceProvider>
      </ToastProvider>
    </QueryProvider>
  </HelmetProvider>
);
