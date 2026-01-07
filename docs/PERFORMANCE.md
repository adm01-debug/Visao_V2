# ⚡ Performance Guide - Projeto VISÃO

## Otimizações de Performance

---

## 1. Métricas Alvo

| Métrica | Alvo | Crítico |
|---------|------|---------|
| LCP | < 2.5s | > 4s |
| FID | < 100ms | > 300ms |
| CLS | < 0.1 | > 0.25 |
| TTI | < 3.8s | > 7.3s |

---

## 2. Code Splitting

```typescript
// Lazy loading de páginas
const DashboardPage = lazy(() => import('./pages/DashboardV2'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
```

---

## 3. Memoization

```typescript
// useMemo para cálculos pesados
const filteredAlerts = useMemo(() => 
  alerts.filter(a => a.severity === 'high'),
  [alerts]
);

// useCallback para funções
const handleClick = useCallback(() => {
  // ...
}, [dependency]);
```

---

## 4. Virtual Scrolling

```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

// Para listas longas (100+ itens)
const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

---

## 5. Image Optimization

```tsx
// Lazy loading
<img loading="lazy" src={url} />

// WebP format
<picture>
  <source srcset={webpUrl} type="image/webp" />
  <img src={jpgUrl} />
</picture>
```

---

## 6. Bundle Size

```bash
# Analisar bundle
npm run build -- --analyze

# Limite recomendado
- Initial JS: < 200KB
- Vendor: < 500KB
```

---

## 7. Streaming Otimizado

| Técnica | Benefício |
|---------|-----------|
| Adaptive bitrate | Qualidade dinâmica |
| Hardware decode | Menor CPU |
| Buffer tuning | Menos stalls |

---

## 8. Database

```sql
-- Índices importantes
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_severity ON alerts(severity);
```

---

## 9. Caching

```typescript
// React Query cache
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min
      cacheTime: 30 * 60 * 1000, // 30 min
    },
  },
});
```

---

## 10. Monitoring

```typescript
// Web Vitals
import { getCLS, getFID, getLCP } from 'web-vitals';

getCLS(console.log);
getFID(console.log);
getLCP(console.log);
```

---

**Última atualização:** 06/01/2026
