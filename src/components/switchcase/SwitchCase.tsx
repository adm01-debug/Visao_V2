import React from 'react';interface Case<T> { value: T; render: React.ReactNode; }interface SwitchCaseProps<T> { value: T; cases: Case<T>[]; defaultRender?: React.ReactNode; }
export function SwitchCase<T>({ value, cases, defaultRender }: SwitchCaseProps<T>) { const matched = cases.find(c => c.value === value); return <>{matched?.render ?? defaultRender}</>; }
export default SwitchCase;