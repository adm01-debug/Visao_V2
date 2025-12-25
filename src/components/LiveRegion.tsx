import { useEffect, useState } from 'react';

interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export const LiveRegion = ({ message, politeness = 'polite', clearAfter = 5000 }: LiveRegionProps) => {
  const [announcement, setAnnouncement] = useState(message);

  useEffect(() => {
    setAnnouncement(message);
    if (clearAfter > 0) {
      const timer = setTimeout(() => setAnnouncement(''), clearAfter);
      return () => clearTimeout(timer);
    }
  }, [message, clearAfter]);

  return (
    <div aria-live={politeness} aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
};
