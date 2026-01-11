# Caching Guide

## Memory Cache
```tsx
import { setMemoryCache, getMemoryCache } from '@/lib/cacheUtils';
setMemoryCache('key', value, 5 * 60 * 1000); // 5 min TTL
const cached = getMemoryCache('key');
```

## Local Storage Cache
```tsx
import { setLocalCache, getLocalCache } from '@/lib/cacheUtils';
setLocalCache('key', value, 24 * 60 * 60 * 1000); // 24h TTL
```

## Memoization
```tsx
import { memoize, memoizeAsync } from '@/lib/cacheUtils';
const memoizedFn = memoize(expensiveFn, 5 * 60 * 1000);
```

---
*Last updated: January 2026*
