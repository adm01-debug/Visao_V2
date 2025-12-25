import { useState, useEffect } from 'react';

interface BatteryState {
  supported: boolean;
  loading: boolean;
  level: number | null;
  charging: boolean | null;
  chargingTime: number | null;
  dischargingTime: number | null;
}

export const useBattery = (): BatteryState => {
  const [state, setState] = useState<BatteryState>({
    supported: true,
    loading: true,
    level: null,
    charging: null,
    chargingTime: null,
    dischargingTime: null,
  });

  useEffect(() => {
    const nav = navigator as any;
    
    if (!nav.getBattery) {
      setState(prev => ({ ...prev, supported: false, loading: false }));
      return;
    }

    let battery: any = null;

    const updateBattery = () => {
      setState({
        supported: true,
        loading: false,
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime,
      });
    };

    nav.getBattery().then((b: any) => {
      battery = b;
      updateBattery();
      
      battery.addEventListener('levelchange', updateBattery);
      battery.addEventListener('chargingchange', updateBattery);
      battery.addEventListener('chargingtimechange', updateBattery);
      battery.addEventListener('dischargingtimechange', updateBattery);
    });

    return () => {
      if (battery) {
        battery.removeEventListener('levelchange', updateBattery);
        battery.removeEventListener('chargingchange', updateBattery);
        battery.removeEventListener('chargingtimechange', updateBattery);
        battery.removeEventListener('dischargingtimechange', updateBattery);
      }
    };
  }, []);

  return state;
};

export default useBattery;
