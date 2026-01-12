import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Cookie, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CookieConsentProps {
  onAccept: () => void;
  onDecline?: () => void;
  privacyUrl?: string;
  className?: string;
}

export function CookieConsent({ onAccept, onDecline, privacyUrl, className }: CookieConsentProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const handleAccept = () => { localStorage.setItem('cookie-consent', 'accepted'); setVisible(false); onAccept(); };
  const handleDecline = () => { localStorage.setItem('cookie-consent', 'declined'); setVisible(false); onDecline?.(); };

  if (!visible) return null;

  return (
    <div className={cn('fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-lg z-50', className)}>
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
        <Cookie className="h-8 w-8 text-primary shrink-0" />
        <p className="text-sm flex-1">
          Utilizamos cookies para melhorar sua experiência. Ao continuar, você concorda com nossa{' '}
          {privacyUrl ? <a href={privacyUrl} className="underline">política de privacidade</a> : 'política de privacidade'}.
        </p>
        <div className="flex gap-2">
          {onDecline && <Button variant="outline" size="sm" onClick={handleDecline}>Recusar</Button>}
          <Button size="sm" onClick={handleAccept}>Aceitar</Button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsent;
