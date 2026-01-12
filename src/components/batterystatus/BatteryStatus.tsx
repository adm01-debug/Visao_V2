import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Battery, BatteryCharging, BatteryLow, BatteryWarning } from 'lucide-react';

interface BatteryStatusProps {
  showPercentage?: boolean;
  className?: string;
}

export function BatteryStatus({ showPercentage = true, className }: BatteryStatusProps) {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);

  useEffect(() => {
    const getBattery = async () => {
      try {
        const batt = await (navigator as any).getBattery?.();
        if (batt) {
          const update = () => setBattery({ level: batt.level * 100, charging: batt.charging });
          update();
          batt.addEventListener('levelchange', update);
          batt.addEventListener('chargingchange', update);
        }
      } catch {}
    };
    getBattery();
  }, []);

  if (!battery) return null;

  const Icon = battery.charging ? BatteryCharging : battery.level < 20 ? BatteryLow : battery.level < 50 ? BatteryWarning : Battery;
  const color = battery.charging ? 'text-green-500' : battery.level < 20 ? 'text-red-500' : battery.level < 50 ? 'text-yellow-500' : 'text-green-500';

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Icon className={cn('h-5 w-5', color)} />
      {showPercentage && <span className="text-sm">{Math.round(battery.level)}%</span>}
    </div>
  );
}

export default BatteryStatus;
