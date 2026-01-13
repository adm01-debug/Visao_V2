import React from 'react';interface ConditionalRenderProps { when: boolean; children: React.ReactNode; fallback?: React.ReactNode; }
export function ConditionalRender({ when, children, fallback }: ConditionalRenderProps) { return <>{when ? children : fallback}</>; }
export default ConditionalRender;