# ⚡ Performance Guide - Projeto VISÃO

## Otimizações de Performance

---

## 1. Métricas Alvo

| Métrica | Alvo |
|---------|------|
| LCP | < 2.5s |
| FID | < 100ms |
| CLS | < 0.1 |
| TTI | < 3.5s |

---

## 2. Code Splitting

```typescript
// Lazy loading de páginas
const DashboardPage = lazy(() => import('./pages/DashboardV2'));
const CamerasPage = lazy(() => import('./pages/CamerasPage'));

<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/cameras" element={<CamerasPage />} />
  </Routes>
</Suspense>
```

---

## 3. React Optimization

### Memoization
```typescript
const MemoizedComponent = React.memo(({ data }) => {
  return <div>{data.name}</div>;
});

const memoizedValue = useMemo(() => {
  return expensiveCalculation(data);
}, [data]);

const memoizedCallback = useCallback(() => {
  handleAction(id);
}, [id]);
```

### Virtual Lists
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

---

## 4. Bundle Size

```bash
# Analisar bundle
npm run build -- --analyze

# Verificar tamanho
npm run size
```

### Limites

| Chunk | Limite |
|-------|--------|
| Main | < 200KB |
| Vendor | < 500KB |
| Total | < 1MB |

---

## 5. Imagens

```typescript
// Lazy loading
<img loading="lazy" src={url} alt={alt} />

// Responsive
<picture>
  <source media="(min-width: 1024px)" srcSet={large} />
  <source media="(min-width: 640px)" srcSet={medium} />
  <img src={small} alt={alt} />
</picture>
```

---

## 6. Caching

### React Query
```typescript
const { data } = useQuery({
  queryKey: ['cameras'],
  queryFn: fetchCameras,
  staleTime: 5 * 60 * 1000, // 5 min
  cacheTime: 30 * 60 * 1000, // 30 min
});
```

### Service Worker
```typescript
// PWA caching
workbox.precaching.precacheAndRoute([
  { url: '/index.html', revision: 'v1' },
  { url: '/models/ssd_mobilenetv1.weights', revision: 'v1' },
]);
```

---

## 7. Streaming

### Adaptive Bitrate
```typescript
const hls = new Hls({
  abrEwmaDefaultEstimate: 500000,
  abrMaxWithRealBitrate: true,
});
```

### Canvas Optimization
```typescript
const ctx = canvas.getContext('2d', {
  alpha: false,
  desynchronized: true,
});
```

---

## 8. Database

### Índices
```sql
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_recognition_camera ON recognition_logs(camera_id, created_at);
```

### Query Optimization
```typescript
// Paginação
const { data } = await supabase
  .from('alerts')
  .select('*')
  .order('created_at', { ascending: false })
  .range(0, 19);
```

---

## 9. Monitoring

```typescript
// Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

---

**Última atualização:** 06/01/2026
