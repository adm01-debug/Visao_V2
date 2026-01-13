import React, { useState, useEffect } from 'react';interface ClientOnlyProps { children: React.ReactNode; fallback?: React.ReactNode; }
export function ClientOnly({ children, fallback }: ClientOnlyProps) { const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true); }, []); return mounted ? <>{children}</> : <>{fallback}</>; }
export default ClientOnly;