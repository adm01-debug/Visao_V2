import React from 'react';import { cn } from '@/lib/utils';
interface Props { ratio?: '1:1' | '4:3' | '16:9' | '21:9'; children: React.ReactNode; className?: string; }
const ratioMap = { '1:1': 'aspect-square', '4:3': 'aspect-[4/3]', '16:9': 'aspect-video', '21:9': 'aspect-[21/9]' };
export function AspectRatio2({ ratio = '16:9', children, className }: Props) { return (<div className={cn('relative overflow-hidden', ratioMap[ratio], className)}>{children}</div>); }
export default AspectRatio2;