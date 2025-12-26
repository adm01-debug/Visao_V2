/**
 * useGamepad Hook
 * Gamepad API support
 */
import { useState, useEffect, useCallback } from 'react';

export function useGamepad() {
  const [gamepads, setGamepads] = useState<(Gamepad | null)[]>([]);
  const [activeGamepad, setActiveGamepad] = useState<Gamepad | null>(null);
  const isSupported = typeof navigator !== 'undefined' && 'getGamepads' in navigator;

  const updateGamepads = useCallback(() => {
    if (!isSupported) return;
    const pads = navigator.getGamepads();
    setGamepads(Array.from(pads));
    setActiveGamepad(pads[0] || null);
  }, [isSupported]);

  useEffect(() => {
    if (!isSupported) return;
    const onConnect = () => updateGamepads();
    const onDisconnect = () => updateGamepads();
    window.addEventListener('gamepadconnected', onConnect);
    window.addEventListener('gamepaddisconnected', onDisconnect);
    const interval = setInterval(updateGamepads, 16);
    return () => {
      window.removeEventListener('gamepadconnected', onConnect);
      window.removeEventListener('gamepaddisconnected', onDisconnect);
      clearInterval(interval);
    };
  }, [isSupported, updateGamepads]);

  return { gamepads, activeGamepad, isSupported };
}
export default useGamepad;
