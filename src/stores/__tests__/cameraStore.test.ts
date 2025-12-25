import { describe, it, expect, beforeEach } from 'vitest';

interface Camera {
  id: string;
  name: string;
  status: 'online' | 'offline';
  location: string;
}

describe('Camera Store', () => {
  let state = {
    cameras: [] as Camera[],
    selectedCamera: null as string | null,
    loading: false,
  };

  const actions = {
    setCameras: (cameras: Camera[]) => {
      state.cameras = cameras;
    },
    addCamera: (camera: Camera) => {
      state.cameras.push(camera);
    },
    updateCamera: (id: string, updates: Partial<Camera>) => {
      const index = state.cameras.findIndex(c => c.id === id);
      if (index >= 0) {
        state.cameras[index] = { ...state.cameras[index], ...updates };
      }
    },
    removeCamera: (id: string) => {
      state.cameras = state.cameras.filter(c => c.id !== id);
    },
    selectCamera: (id: string | null) => {
      state.selectedCamera = id;
    },
    setLoading: (loading: boolean) => {
      state.loading = loading;
    },
  };

  beforeEach(() => {
    state = { cameras: [], selectedCamera: null, loading: false };
  });

  it('should start with empty cameras', () => {
    expect(state.cameras).toHaveLength(0);
  });

  it('should set cameras', () => {
    const cameras: Camera[] = [
      { id: '1', name: 'Camera 1', status: 'online', location: 'Entrance' },
      { id: '2', name: 'Camera 2', status: 'offline', location: 'Parking' },
    ];
    actions.setCameras(cameras);
    expect(state.cameras).toHaveLength(2);
  });

  it('should add camera', () => {
    actions.addCamera({ id: '1', name: 'New Camera', status: 'online', location: 'Hall' });
    expect(state.cameras).toHaveLength(1);
  });

  it('should update camera', () => {
    actions.addCamera({ id: '1', name: 'Camera 1', status: 'online', location: 'Entrance' });
    actions.updateCamera('1', { status: 'offline' });
    expect(state.cameras[0].status).toBe('offline');
  });

  it('should remove camera', () => {
    actions.addCamera({ id: '1', name: 'Camera 1', status: 'online', location: 'Entrance' });
    actions.removeCamera('1');
    expect(state.cameras).toHaveLength(0);
  });

  it('should select camera', () => {
    actions.selectCamera('cam-1');
    expect(state.selectedCamera).toBe('cam-1');
  });
});
