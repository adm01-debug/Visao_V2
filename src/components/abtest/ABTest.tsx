import React from 'react';interface ABTestProps { testId: string; variant: 'A' | 'B'; renderA: React.ReactNode; renderB: React.ReactNode; }
export function ABTest({ testId, variant, renderA, renderB }: ABTestProps) { return variant === 'A' ? <>{renderA}</> : <>{renderB}</>; }
export default ABTest;