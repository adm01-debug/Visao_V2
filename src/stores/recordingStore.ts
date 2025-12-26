/**
 * Recording Store
 * State for recordings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Recording { id: string; name: string; type: 'video' | 'audio' | 'screen'; blob?: Blob; url?: string; duration: number; size: number; createdAt: Date; }

interface RecordingState {
  recordings: Recording[];
  isRecording: boolean;
  currentRecording: Recording | null;
  addRecording: (recording: Recording) => void;
  removeRecording: (id: string) => void;
  setRecording: (isRecording: boolean) => void;
  setCurrentRecording: (recording: Recording | null) => void;
}

export const useRecordingStore = create<RecordingState>()(persist((set) => ({
  recordings: [],
  isRecording: false,
  currentRecording: null,
  addRecording: (recording) => set((s) => ({ recordings: [recording, ...s.recordings] })),
  removeRecording: (id) => set((s) => ({ recordings: s.recordings.filter(r => r.id !== id) })),
  setRecording: (isRecording) => set({ isRecording }),
  setCurrentRecording: (currentRecording) => set({ currentRecording }),
}), { name: 'recording-store' }));

export default useRecordingStore;
