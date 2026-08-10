/**
 * Playback Store
 * Media playback state
 */
import { create } from 'zustand';

interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isLooping: boolean;
  currentMediaId: string | null;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  setPlaybackRate: (rate: number) => void;
  setLooping: (loop: boolean) => void;
  setCurrentMedia: (id: string | null) => void;
  setDuration: (duration: number) => void;
}

export const usePlaybackStore = create<PlaybackState>((set) => ({
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  playbackRate: 1,
  isLooping: false,
  currentMediaId: null,
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  toggle: () => set((s) => ({ isPlaying: !s.isPlaying })),
  seek: (currentTime) => set({ currentTime }),
  setVolume: (volume) => set({ volume }),
  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  setLooping: (isLooping) => set({ isLooping }),
  setCurrentMedia: (currentMediaId) => set({ currentMediaId, currentTime: 0 }),
  setDuration: (duration) => set({ duration }),
}));

export default usePlaybackStore;
