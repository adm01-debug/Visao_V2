import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export const NavigationProgress = React.forwardRef<HTMLDivElement>(function NavigationProgress(_props, _ref) {
  const location = useLocation();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setIsNavigating(true);
    setProgress(0);

    const t1 = setTimeout(() => setProgress(40), 50);
    const t2 = setTimeout(() => setProgress(80), 200);
    const t3 = setTimeout(() => setProgress(100), 350);
    const t4 = setTimeout(() => setIsNavigating(false), 500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [location.pathname]);

  if (!isNavigating) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] h-0.5">
      <div
        className="h-full bg-primary rounded-r-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px hsl(var(--primary) / 0.5)',
        }}
      />
    </div>
  );
}