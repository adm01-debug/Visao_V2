import { ReactNode } from 'react';

interface AuthLayoutProps { children: ReactNode; }

export const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
    <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-xl shadow-xl">{children}</div>
  </div>
);
