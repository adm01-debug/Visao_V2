import React from 'react';
import { Tooltip } from '@/components/tooltip/Tooltip';
import { HelpCircle } from 'lucide-react';

interface InfoTipProps {
  content: string;
  iconSize?: number;
  className?: string;
}

export function InfoTip({ content, iconSize = 16, className }: InfoTipProps) {
  return (
    <Tooltip content={content}>
      <HelpCircle className={className} style={{ width: iconSize, height: iconSize }} />
    </Tooltip>
  );
}

export default InfoTip;
