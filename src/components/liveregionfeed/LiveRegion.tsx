import React from 'react';interface LiveRegionProps { children: React.ReactNode; politeness?: 'polite' | 'assertive'; }
export function LiveRegion({ children, politeness = 'polite' }: LiveRegionProps) { return <div role="status" aria-live={politeness} aria-atomic="true" className="sr-only">{children}</div>; }
export default LiveRegion;