import { ReactNode } from 'react';

interface ErrorLayoutProps { children: ReactNode; }

export const ErrorLayout = ({ children }: ErrorLayoutProps) => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">{children}</div>
  </div>
);
