# State Management Guide

## Overview

VIS-O uses Zustand for state management.

## Store Structure

Stores are in `src/stores/`:
- `authStore.ts` - Authentication state
- `appStore.ts` - App-wide state
- `uiStore.ts` - UI state
- `cameraStore.ts` - Camera state
- `alertStore.ts` - Alerts state

## Usage

```tsx
import { useAuthStore } from '@/stores/authStore';

function Component() {
  const { user, login, logout } = useAuthStore();
  return <div>{user?.name}</div>;
}
```

## Creating a Store

```tsx
import { create } from 'zustand';

interface MyStore {
  value: number;
  increment: () => void;
}

export const useMyStore = create<MyStore>((set) => ({
  value: 0,
  increment: () => set((state) => ({ value: state.value + 1 })),
}));
```

## Persistence

Use `persist` middleware for localStorage:

```tsx
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set) => ({ /* ... */ }),
    { name: 'store-name' }
  )
);
```

## DevTools

Zustand devtools are enabled in development.

---
*Last updated: January 2026*
