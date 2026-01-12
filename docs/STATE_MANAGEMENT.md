# State Management Guide

## Overview

VIS-O uses Zustand for state management.

## Stores

### Location
All stores are in `src/stores/`

### Structure
```ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface MyStore {
  data: Data[];
  loading: boolean;
  fetchData: () => Promise<void>;
}

export const useMyStore = create<MyStore>()(
  devtools(
    persist(
      (set) => ({
        data: [],
        loading: false,
        fetchData: async () => {
          set({ loading: true });
          const data = await api.getData();
          set({ data, loading: false });
        },
      }),
      { name: 'my-store' }
    )
  )
);
```

## Usage in Components

```tsx
function MyComponent() {
  const { data, loading, fetchData } = useMyStore();
  
  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <Loading />;
  return <DataList data={data} />;
}
```

## Best Practices

1. Keep stores small and focused
2. Use selectors for derived state
3. Avoid storing computed values
4. Use devtools in development
5. Persist only necessary data

## Available Stores

| Store | Description |
|-------|-------------|
| authStore | Authentication state |
| cameraStore | Camera management |
| alertStore | Alert notifications |
| uiStore | UI state (theme, sidebar) |
| settingsStore | User settings |

---

*Last updated: January 2026*
