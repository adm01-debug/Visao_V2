import React, { Suspense, ReactNode } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Loader2 } from 'lucide-react';

interface PageWrapperProps {
  children: ReactNode;
  loadingText?: string;
}

const PageLoader = ({ text = 'Carregando...' }: { text?: string }) => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <span className="text-muted-foreground text-sm">{text}</span>
    </div>
  </div>
);

export const PageWrapper: React.FC<PageWrapperProps> = ({ children, loadingText }) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader text={loadingText} />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

export default PageWrapper;
