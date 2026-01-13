import React from 'react';interface ServerOnlyProps { children: React.ReactNode; }
export function ServerOnly({ children }: ServerOnlyProps) { if (typeof window !== 'undefined') return null; return <>{children}</>; }
export default ServerOnly;