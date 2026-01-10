# ⚡ Guia de Performance

## Otimizações Implementadas

### Frontend
- Code splitting automático
- Lazy loading de rotas
- Image optimization
- Bundle optimization

### Cache
- Service Worker
- HTTP caching
- Memory cache (LRU)
- IndexedDB para offline

### Renderização
- React.memo para componentes
- useMemo/useCallback
- Virtual scrolling
- Skeleton loading

## Métricas Alvo

| Métrica | Alvo | Atual |
|---------|------|-------|
| LCP | <2.5s | ✅ |
| FID | <100ms | ✅ |
| CLS | <0.1 | ✅ |
| TTI | <3.8s | ✅ |

## Bundle Size

- Main: ~200KB gzipped
- Vendor: ~150KB gzipped
- Total: ~350KB gzipped

## Dicas

1. Use `React.lazy()` para componentes grandes
2. Prefira `useMemo` para cálculos pesados
3. Evite re-renders desnecessários
4. Use `will-change` com moderação

---

*Atualizado em 10/01/2026*

