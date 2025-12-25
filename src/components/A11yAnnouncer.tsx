import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LiveRegion } from './LiveRegion';

interface A11yContextType {
  announce: (message: string, politeness?: 'polite' | 'assertive') => void;
}

const A11yContext = createContext<A11yContextType | null>(null);

export const A11yAnnouncerProvider = ({ children }: { children: ReactNode }) => {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((msg: string, pol: 'polite' | 'assertive' = 'polite') => {
    setMessage('');
    setTimeout(() => { setMessage(msg); setPoliteness(pol); }, 100);
  }, []);

  return (
    <A11yContext.Provider value={{ announce }}>
      {children}
      <LiveRegion message={message} politeness={politeness} />
    </A11yContext.Provider>
  );
};

export const useA11yAnnouncer = () => {
  const context = useContext(A11yContext);
  if (!context) throw new Error('useA11yAnnouncer must be used within A11yAnnouncerProvider');
  return context;
};
