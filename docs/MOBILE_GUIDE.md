# Mobile Development Guide

## Overview

Mobile-specific considerations for VIS-O.

## Responsive Design

### Breakpoints
```css
sm: 640px
md: 768px
lg: 1024px
xl: 1280px
```

### Touch Targets
- Minimum 44x44px for touch targets
- 8px minimum spacing between targets

## Performance

### Optimizations
- Lazy load images
- Minimize JavaScript
- Use service workers
- Implement skeleton loading

### Image Loading
```tsx
<img
  src={thumbnail}
  loading="lazy"
  srcSet={`${small} 480w, ${medium} 768w, ${large} 1200w`}
  sizes="(max-width: 768px) 100vw, 50vw"
/>
```

## Gestures

### Swipe
```tsx
import { useSwipe } from '@/hooks/useSwipe';

const { onTouchStart, onTouchMove, onTouchEnd } = useSwipe({
  onSwipeLeft: () => nextSlide(),
  onSwipeRight: () => prevSlide(),
});
```

### Pull to Refresh
```tsx
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

usePullToRefresh({
  onRefresh: async () => {
    await refetchData();
  },
});
```

## Offline Support

### Service Worker
- Cache static assets
- Queue failed requests
- Show offline indicator

### Sync
```ts
if ('sync' in registration) {
  await registration.sync.register('sync-data');
}
```

## PWA

### Install Prompt
```ts
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  deferredPrompt = e;
});
```

---

*Last updated: January 2026*
