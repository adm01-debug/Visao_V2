import React from 'react';interface DebugOnlyProps { children: React.ReactNode; }
export function DebugOnly({ children }: DebugOnlyProps) { if (process.env.NODE_ENV !== 'development') return null; return <>{children}</>; }
export default DebugOnly;