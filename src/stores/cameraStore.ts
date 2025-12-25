import { create } from 'zustand';

interface Camera { id: string; name: string; url: string; status: 'online' | 'offline' | 'error'; location?: string; }

interface CameraStore {
  cameras: Camera[];
  selectedCamera: Camera | null;
  loading: boolean;
  setCameras: (cameras: Camera[]) => void;
  addCamera: (camera: Camera) => void;
  updateCamera: (id: string, updates: Partial<Camera>) => void;
  removeCamera: (id: string) => void;
  selectCamera: (camera: Camera | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useCameraStore = create<CameraStore>((set) => ({
  cameras: [],
  selectedCamera: null,
  loading: false,
  setCameras: (cameras) => set({ cameras }),
  addCamera: (camera) => set((state) => ({ cameras: [...state.cameras, camera] })),
  updateCamera: (id, updates) => set((state) => ({
    cameras: state.cameras.map(c => c.id === id ? { ...c, ...updates } : c),
  })),
  removeCamera: (id) => set((state) => ({
    cameras: state.cameras.filter(c => c.id !== id),
    selectedCamera: state.selectedCamera?.id === id ? null : state.selectedCamera,
  })),
  selectCamera: (camera) => set({ selectedCamera: camera }),
  setLoading: (loading) => set({ loading }),
}));

export default useCameraStore;
