import React from 'react';interface HideWhenProps { condition: boolean; children: React.ReactNode; }
export function HideWhen({ condition, children }: HideWhenProps) { return condition ? null : <>{children}</>; }
export default HideWhen;