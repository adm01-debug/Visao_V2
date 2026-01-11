import { useState, useEffect } from 'react';

export interface BatteryState {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  isSupported: boolean;
}

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
}

declare global {
  interface Navigator { getBattery?: () => Promise<BatteryManager>; }
}

export const useBattery = (): BatteryState => {
  const [state, setState] = useState<BatteryState>({
    charging: false, chargingTime: Infinity, dischargingTime: Infinity, level: 1, isSupported: false,
  });

  useEffect(() => {
    try {
    if (!navigator.getBattery) return;

    let battery: BatteryManager | null = null;

    const updateBattery = () => {
      if (!battery) return;
      setState({
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
        level: battery.level,
        isSupported: true,
      });
    };

    navigator.getBattery().then((b) => {
      battery = b;
      updateBattery();
      battery.addEventListener('chargingchange', updateBattery);
      battery.addEventListener('chargingtimechange', updateBattery);
      battery.addEventListener('dischargingtimechange', updateBattery);
      battery.addEventListener('levelchange', updateBattery);
    });

    return () => {
      if (battery) {
        battery.removeEventListener('chargingchange', updateBattery);
        battery.removeEventListener('chargingtimechange', updateBattery);
        battery.removeEventListener('dischargingtimechange', updateBattery);
        battery.removeEventListener('levelchange', updateBattery);
      }
    };
  }, []);

  return state;
};

export default useBattery;
