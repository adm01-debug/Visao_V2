import { ReactNode } from 'react';

interface MinimalLayoutProps { children: ReactNode; }

export const MinimalLayout = ({ children }: MinimalLayoutProps) => (
  <div className="min-h-screen bg-background"><main className="container mx-auto px-4 py-8">{children}</main></div>
);
