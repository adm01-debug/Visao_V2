/**
 * AriaLive Component
 * Screen reader announcements for dynamic content
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

export type AriaLivePoliteness = 'off' | 'polite' | 'assertive';

export interface AriaLiveProps {
  /** Content to announce */
  message?: string;
  /** Politeness level */
  politeness?: AriaLivePoliteness;
  /** Delay before announcing (ms) */
  delay?: number;
  /** Clear message after announcing */
  clearOnAnnounce?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Children to render visually */
  children?: React.ReactNode;
}

export interface AriaLiveContextValue {
  announce: (message: string, politeness?: AriaLivePoliteness) => void;
  clear: () => void;
}

const AriaLiveContext = React.createContext<AriaLiveContextValue | null>(null);

export function useAriaLive(): AriaLiveContextValue {
  const context = React.useContext(AriaLiveContext);
  if (!context) {
    throw new Error('useAriaLive must be used within an AriaLiveProvider');
  }
  return context;
}

export function AriaLiveProvider({ children }: { children: React.ReactNode }) {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  const announce = useCallback((message: string, politeness: AriaLivePoliteness = 'polite') => {
    if (politeness === 'assertive') {
      setAssertiveMessage('');
      setTimeout(() => setAssertiveMessage(message), 50);
    } else {
      setPoliteMessage('');
      setTimeout(() => setPoliteMessage(message), 50);
    }
  }, []);

  const clear = useCallback(() => {
    setPoliteMessage('');
    setAssertiveMessage('');
  }, []);

  return (
    <AriaLiveContext.Provider value={{ announce, clear }}>
      {children}
      <AriaLiveRegion message={politeMessage} politeness="polite" />
      <AriaLiveRegion message={assertiveMessage} politeness="assertive" />
    </AriaLiveContext.Provider>
  );
}

function AriaLiveRegion({
  message,
  politeness,
}: {
  message: string;
  politeness: AriaLivePoliteness;
}) {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );
}

export function AriaLive({
  message,
  politeness = 'polite',
  delay = 0,
  clearOnAnnounce = true,
  className,
  children,
}: AriaLiveProps) {
  const [announcement, setAnnouncement] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (message) {
      // Clear previous timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set announcement with delay
      timeoutRef.current = setTimeout(() => {
        // Clear first to ensure re-announcement of same message
        setAnnouncement('');
        
        requestAnimationFrame(() => {
          setAnnouncement(message);
          
          if (clearOnAnnounce) {
            timeoutRef.current = setTimeout(() => {
              setAnnouncement('');
            }, 1000);
          }
        });
      }, delay);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, delay, clearOnAnnounce]);

  return (
    <>
      {/* Visual content if provided */}
      {children && <div className={className}>{children}</div>}
      
      {/* Screen reader only announcement */}
      <div
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        aria-relevant="additions text"
        className={cn(
          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
          '[clip:rect(0,0,0,0)]',
          className
        )}
      >
        {announcement}
      </div>
    </>
  );
}

// Utility hook for announcements
export function useAnnounce() {
  const [message, setMessage] = useState('');

  const announce = useCallback((text: string) => {
    setMessage('');
    requestAnimationFrame(() => setMessage(text));
  }, []);

  const clear = useCallback(() => setMessage(''), []);

  return { message, announce, clear };
}

// Higher-order component for automatic announcements
export function withAriaAnnouncement<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  getAnnouncement: (props: P) => string | undefined
) {
  return function AnnouncementWrapper(props: P) {
    const announcement = getAnnouncement(props);
    
    return (
      <>
        <WrappedComponent {...props} />
        {announcement && <AriaLive message={announcement} />}
      </>
    );
  };
}

// Pre-built announcements
export const AlertAnnouncement = ({ type, camera }: { type: string; camera: string }) => (
  <AriaLive
    message={`Novo alerta: ${type} detectado na câmera ${camera}`}
    politeness="assertive"
  />
);

export const LoadingAnnouncement = ({ loading }: { loading: boolean }) => (
  <AriaLive
    message={loading ? 'Carregando...' : 'Carregamento concluído'}
    politeness="polite"
  />
);

export const ErrorAnnouncement = ({ error }: { error?: string }) => (
  <AriaLive
    message={error ? `Erro: ${error}` : ''}
    politeness="assertive"
  />
);

export const SuccessAnnouncement = ({ message }: { message?: string }) => (
  <AriaLive
    message={message || 'Operação realizada com sucesso'}
    politeness="polite"
  />
);

export default AriaLive;
