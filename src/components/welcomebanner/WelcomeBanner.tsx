/**
 * VIS-O - Sistema de Vigilância Inteligente
 * WelcomeBanner - Welcome banner for dashboard
 * 
 * @module components/welcomebanner
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface WelcomeBannerProps {
  className?: string;
  children?: React.ReactNode;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("welcomebanner", className)}>
      {children}
    </div>
  );
};

WelcomeBanner.displayName = 'WelcomeBanner';

export default WelcomeBanner;
