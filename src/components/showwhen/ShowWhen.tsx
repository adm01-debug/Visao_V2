import React from 'react';interface ShowWhenProps { condition: boolean; children: React.ReactNode; }
export function ShowWhen({ condition, children }: ShowWhenProps) { return condition ? <>{children}</> : null; }
export default ShowWhen;