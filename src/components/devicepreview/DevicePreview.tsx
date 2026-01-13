import React from 'react';
import { cn } from '@/lib/utils';
import { Laptop, Smartphone, Tablet, Monitor, Chrome, Globe } from 'lucide-react';

interface DevicePreviewProps { device: 'desktop' | 'laptop' | 'tablet' | 'mobile'; children: React.ReactNode; className?: string; }

const frames = {
  desktop: { w: 'w-full max-w-4xl', h: 'h-[600px]', frame: 'rounded-lg border-8 border-zinc-800' },
  laptop: { w: 'w-full max-w-3xl', h: 'h-[500px]', frame: 'rounded-t-lg border-4 border-zinc-700' },
  tablet: { w: 'w-[768px]', h: 'h-[1024px]', frame: 'rounded-3xl border-8 border-zinc-800' },
  mobile: { w: 'w-[375px]', h: 'h-[812px]', frame: 'rounded-[40px] border-8 border-zinc-800' },
};

export function DevicePreview({ device, children, className }: DevicePreviewProps) {
  const { w, h, frame } = frames[device];
  return (
    <div className={cn('flex flex-col items-center', className)}>
      <div className={cn('bg-white overflow-hidden', w, h, frame)}>{children}</div>
      {device === 'laptop' && <div className="w-full max-w-3xl h-4 bg-zinc-700 rounded-b-lg" />}
    </div>
  );
}

export default DevicePreview;
