

## Plano: Micro-animações nos Cards do Dashboard

### Status atual
- `StatCard` e `DataCard` já têm `hover:-translate-y-0.5 + shadow-lg + scale icon` (lift básico ok).
- Skeletons de listagem já têm shimmer.
- **Faltam:** entrada escalonada (stagger) ao montar, brilho sutil ao hover (sheen), e tap feedback mobile.

### Ações

**1. `tailwind.config.ts`** — Adicionar keyframes reutilizáveis:
- `card-lift`: leve translate + shadow ramp (300ms)
- `sheen`: gradiente diagonal passando 1x no hover (700ms)
- `card-enter`: fade + slide-up 8px (400ms ease-out)

**2. `src/components/StatCard.tsx`** — Refinar:
- Adicionar `animate-card-enter` com `style={{ animationDelay }}` opcional (prop `index?: number` → `${index * 60}ms`).
- Adicionar wrapper `relative overflow-hidden` + `<span>` absoluto para efeito sheen no hover (`opacity-0 group-hover:opacity-100`, gradiente from-transparent via-primary/10 to-transparent + animação translateX).
- Adicionar `active:scale-[0.98]` para feedback tap mobile.

**3. `src/components/common/DataCard.tsx`** — Mesmo tratamento (sheen + active scale + card-enter com delay).

**4. `src/components/dashboard/DashboardStats.tsx`** — Passar `index` para cada card renderizado para criar efeito cascata na entrada.

**5. `src/components/alpr/ALPRStatsCards.tsx`** — Passar `index` igualmente (consistência ALPR Dashboard).

**6. Validação**
- `npx tsc --noEmit` → zero erros.
- Confirmar que `prefers-reduced-motion` é respeitado (Tailwind já o faz globalmente via `motion-reduce:` — adicionar `motion-reduce:transform-none motion-reduce:animate-none` nos novos efeitos).

### Resultado esperado
- Cards entram em cascata suave ao carregar (60ms stagger).
- Hover combina lift atual + sheen diagonal sutil sobre o card.
- Tap em mobile: micro-shrink (98%) com retorno spring.
- Acessibilidade preservada (`motion-reduce` desativa tudo).
- Zero regressões — apenas adições de classes/keyframes.

### Tempo estimado
~8 minutos.

