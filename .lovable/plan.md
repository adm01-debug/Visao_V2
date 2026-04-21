

## Verificar e corrigir keyframes `shimmer` e `skeleton-brand-pulse`

Os componentes `Skeleton` e `BrandedSkeleton` em `src/components/ui/skeleton.tsx` referenciam duas animações que **podem não estar definidas** no `tailwind.config.ts` / `index.css`:

1. `after:animate-[shimmer_2s_infinite]` — usado em `Skeleton` e `BrandedSkeleton`.
2. `animation: 'skeleton-brand-pulse 3s ease-in-out infinite'` — usado inline em `BrandedSkeleton`.

Se os keyframes não estiverem registrados, no build de produção (com purge do Tailwind) a animação não roda — o esqueleto fica estático, sem o efeito de shimmer/pulse que o design requer.

### Investigação

1. Ler `tailwind.config.ts` para checar se `shimmer` está em `keyframes` + `animation`.
2. Ler `src/index.css` para checar `@keyframes shimmer` e `@keyframes skeleton-brand-pulse` globais.
3. Confirmar quais arquivos de skeleton usam essas animações (`grep` por `shimmer` e `skeleton-brand-pulse`).

### Correções (a aplicar conforme achados)

**Caso A — keyframes ausentes no Tailwind config:**
Adicionar em `tailwind.config.ts`:
```ts
keyframes: {
  shimmer: {
    '0%': { transform: 'translateX(-100%)' },
    '100%': { transform: 'translateX(100%)' },
  },
  'skeleton-brand-pulse': {
    '0%, 100%': { opacity: '0.15', transform: 'scale(1)' },
    '50%': { opacity: '0.35', transform: 'scale(1.05)' },
  },
},
animation: {
  shimmer: 'shimmer 2s infinite',
  'skeleton-brand-pulse': 'skeleton-brand-pulse 3s ease-in-out infinite',
},
```

**Caso B — keyframes só em `index.css` (CSS global):**
Garantir que estão na camada `@layer utilities` e que o seletor JIT do Tailwind (`animate-[shimmer_2s_infinite]`) funciona — adicionar safelist no `tailwind.config.ts`:
```ts
safelist: ['animate-[shimmer_2s_infinite]'],
```

**Caso C — animação correta mas sem visibilidade:**
Verificar se a opacidade do gradiente shimmer (`via-primary/5`) é suficiente em ambos os temas (dark/light). Se necessário, aumentar para `via-primary/10` ou `via-foreground/5`.

### Validação

1. `npm run build` — confirma que o JIT do Tailwind preservou a classe `animate-[shimmer_2s_infinite]`.
2. Inspecionar `dist/assets/*.css` por `@keyframes shimmer` e `skeleton-brand-pulse` — devem aparecer.
3. Visual: skeletons devem ter brilho passando da esquerda para a direita a cada 2s; `BrandedSkeleton` deve pulsar suavemente o ícone Shield.

### Arquivos potencialmente editados

- ✏️ `tailwind.config.ts` — registrar keyframes + animations + safelist.
- ✏️ `src/index.css` — apenas se faltar `@keyframes` global (fallback).
- ✏️ `src/components/ui/skeleton.tsx` — apenas se opacidade do gradiente precisar reforço.

### Riscos

- **Risco:** keyframes duplicados (Tailwind + CSS global) podem conflitar.
  - **Mitigação:** manter apenas uma fonte (preferência: `tailwind.config.ts` para integração com purge/JIT).
- **Risco:** `animate-[shimmer_2s_infinite]` (arbitrary value) ser purgado no build.
  - **Mitigação:** safelist explícita ou trocar para classe utility nomeada (`animate-shimmer`).

