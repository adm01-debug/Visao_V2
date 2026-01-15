/**
 * VIS-O - Sistema de Vigilância Inteligente
 * VehicleList - List of vehicles with details
 * 
 * @module components/vehiclelist
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface VehicleListProps {
  className?: string;
  children?: React.ReactNode;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("vehiclelist", className)}>
      {children}
    </div>
  );
};

VehicleList.displayName = 'VehicleList';

export default VehicleList;
