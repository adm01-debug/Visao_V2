import React from 'react';interface SROnlyProps { children: React.ReactNode; }
export function SROnly({ children }: SROnlyProps) { return <span className="sr-only">{children}</span>; }
export default SROnly;