# Performance Optimization Guide

## Overview

Best practices for optimizing VIS-O performance.

## React Optimization

### Memoization
```tsx
import { memo, useMemo, useCallback } from 'react';

// Memoize components
const MyComponent = memo(({ data }) => <div>{data}</div>);

// Memoize values
const filtered = useMemo(() => data.filter(x => x.active), [data]);

// Memoize callbacks
const handleClick = useCallback(() => doSomething(id), [id]);
```

### Virtual Lists
```tsx
import { useVirtualList } from '@/hooks/useVirtualList';

const { virtualItems, containerProps } = useVirtualList({
  items: largeArray,
  itemHeight: 50,
  containerHeight: 400,
});
```

### Lazy Loading
```tsx
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

## Caching

### Memory Cache
```ts
import { setMemoryCache, getMemoryCache } from '@/lib/cacheUtils';

setMemoryCache('key', data, 5 * 60 * 1000); // 5 min TTL
const cached = getMemoryCache('key');
```

### Memoized Functions
```ts
import { memoize } from '@/lib/cacheUtils';

const expensiveCalc = memoize((input) => heavyComputation(input));
```

## Images

### Lazy Loading Images
```tsx
import { useLazyImage } from '@/hooks/useIntersectionObserver';

const { ref, imageSrc, isLoaded } = useLazyImage(src, placeholder);
```

### Optimization
- Use WebP format
- Responsive images with srcset
- Compress before upload

## Bundle Size

### Code Splitting
- Split by route
- Split by feature
- Dynamic imports

### Tree Shaking
- Use ES modules
- Avoid side effects
- Mark pure functions

## Network

### Request Batching
- Batch API calls
- Use GraphQL when possible
- Implement request deduplication

### Compression
- Enable gzip/brotli
- Minify JS/CSS
- Compress images

## Monitoring

### Web Vitals
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

### Tools
- Lighthouse
- Chrome DevTools
- React DevTools

---

*Last updated: January 2026*
