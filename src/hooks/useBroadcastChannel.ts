/**
 * useBroadcastChannel Hook
 * Cross-tab communication
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useBroadcastChannel<T = unknown>(channelName: string) {
  const [lastMessage, setLastMessage] = useState<T | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const isSupported = typeof BroadcastChannel !== 'undefined';

  useEffect(() => {
    try {
    if (!isSupported) return;
    const channel = new BroadcastChannel(channelName);
    channel.onmessage = (e) => setLastMessage(e.data);
    channelRef.current = channel;
    return () => channel.close();
  }, [channelName, isSupported]);

  const postMessage = useCallback((message: T) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { lastMessage, isSupported, postMessage };
}
export default useBroadcastChannel;
