import { useState, useEffect } from 'react';

type Orientation = 'portrait' | 'landscape';

export function useScreenOrientation() {
  const [orientation, setOrientation] = useState<Orientation>(() => 
    typeof window !== 'undefined' && window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
  );
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const update = () => {
      const screenOrientation = screen.orientation;
      setAngle(screenOrientation?.angle || 0);
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };
    
    window.addEventListener('resize', update);
    screen.orientation?.addEventListener('change', update);
    
    return () => {
      window.removeEventListener('resize', update);
      screen.orientation?.removeEventListener('change', update);
    };
  }, []);

  return { orientation, angle };
}

export default useScreenOrientation;
