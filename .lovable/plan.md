

## Fallback global para `mb-mobile-nav` em wrappers customizados

Hoje, se uma página renderizar seu próprio scroll container ou substituir o `<main>` por outra estrutura, ela perde o `mb-mobile-nav` aplicado pelo `MainLayout`. A solução é garantir que **todo conteúdo dentro do layout autenticado** receba o padding inferior automaticamente, independente do wrapper que a página escolha.

### Estratégia: defesa em profundidade no CSS global

Em vez de depender apenas da classe `mb-mobile-nav` no `<main>`, adicionar uma regra CSS global que aplica o `padding-bottom` seguro a **qualquer descendente direto de scroll do layout autenticado**, usando um seletor por atributo data.

### Mudanças

**1. `src/components/layout/MainLayout.tsx`** — marcar o container de scroll com `data-app-scroll`:
```tsx
<SwipeableView className="flex-1 overflow-auto" data-app-scroll>
  <main id="main-content" className="p-4 md:p-6 mb-mobile-nav min-h-full" ...>
```

**2. `src/layouts/MainLayout.tsx`** (wrapper alternativo) — mesma marcação:
```tsx
<SwipeableView className="flex-1 overflow-auto" data-app-scroll>
```

**3. `src/index.css`** — regra fallback no `@layer components`:
```css
@media (max-width: 767px) {
  /* Fallback: garante padding inferior para qualquer conteúdo dentro do scroll do layout,
     mesmo que a página substitua o <main> ou use wrapper customizado sem mb-mobile-nav */
  [data-app-scroll] > *:last-child:not(.mb-mobile-nav) {
    padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
  }
}
```

A regra só aplica se o último filho **não** já tiver `mb-mobile-nav` (evita dupla margem). Cobre casos como:
- Página renderiza `<div>` raiz própria em vez do `<main>` do layout
- Wrapper customizado embutido (ex.: `<DashboardShell>`) que esquece a classe
- Conteúdo direto sem wrapper (children diretos do `SwipeableView`)

**4. `SwipeableView`** — confirmar que aceita e propaga `data-app-scroll` (provavelmente já o faz via `...rest props`; só verificar/ajustar se necessário).

**5. `scripts/check-mobile-nav.mjs`** — atualizar mensagem de log para mencionar o fallback como rede de proteção, mas manter as validações atuais (a classe explícita ainda é a forma preferida; fallback é segurança).

**6. Documentação e memória**:
- `docs/LAYOUTS.md` seção 11: adicionar nota sobre o fallback automático e quando ele atua.
- `mem://standards/mobile-nav-checklist`: documentar a defesa em profundidade (classe explícita + fallback CSS).

### Validação

1. Inspecionar via DOM no preview: confirmar que `[data-app-scroll]` está presente e que o último filho recebe padding em viewport mobile (≤767px).
2. Testar caso de wrapper customizado: criar mentalmente uma página que substitui o `<main>` e verificar (via seletor CSS) que o fallback ativa.
3. Confirmar que páginas com `mb-mobile-nav` explícito **não** recebem padding duplicado (graças ao `:not(.mb-mobile-nav)`).
4. `npm run check:mobile-nav` continua passando sem regressão.

### Arquivos editados

- ✏️ `src/components/layout/MainLayout.tsx` (atributo `data-app-scroll`)
- ✏️ `src/layouts/MainLayout.tsx` (atributo `data-app-scroll`)
- ✏️ `src/components/SwipeableView.tsx` (verificar propagação de props se necessário)
- ✏️ `src/index.css` (regra fallback `[data-app-scroll] > *:last-child`)
- ✏️ `scripts/check-mobile-nav.mjs` (mensagem informativa atualizada)
- ✏️ `docs/LAYOUTS.md` (seção 11 — fallback)
- ✏️ `.lovable/memory/standards/mobile-nav-checklist.md` (defesa em profundidade)

### Riscos

- **Risco:** seletor `> *:last-child` pode pegar elemento decorativo (ex.: portal, toast container) se renderizado dentro do scroll.
  - **Mitigação:** portais geralmente vivem em `document.body` (fora do scroll); restringir ainda mais o seletor para `[data-app-scroll] > main:last-child, [data-app-scroll] > div:last-child` se aparecerem efeitos colaterais.
- **Risco:** nested wrappers (`<div><div>conteúdo</div></div>`) — só o `div` externo recebe padding, conteúdo interno pode ainda ser cortado se tiver overflow próprio.
  - **Mitigação:** padding no externo empurra todo o conteúdo interno para cima; só falha se o `div` interno tiver `height` fixa (já bloqueado pelo script anti `h-[calc(100vh-...)]`).

