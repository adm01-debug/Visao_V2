

## Diagnóstico: scroll duplo e corte de conteúdo no mobile (iOS/Safari)

### Problemas confirmados na auditoria

**1. Scroll duplo em várias páginas (CRÍTICO)**

5 páginas declaram seu próprio container com `h-[calc(100vh-4rem)] overflow-auto`, criando um segundo scroll dentro do scroll do `SwipeableView`/`<main>` do `MainLayout`:

- `src/pages/SettingsPage.tsx:41`
- `src/pages/SecurityPage.tsx:92`
- `src/pages/AlertsPage.tsx:123`
- `src/pages/DashboardV2.tsx:101, 105`
- `src/pages/CamerasPage.tsx:82`

Sintomas no iOS: dois scrolls aninhados, momentum quebrado, `mb-mobile-nav` aplicado no `<main>` é "engolido" pelo overflow interno → conteúdo fica escondido atrás do BottomNavigation. No iOS Safari, `100vh` ainda inclui a barra de URL dinâmica, então `calc(100vh - 4rem)` extrapola a altura visível e corta a parte inferior.

**2. `h-screen` no root do MainLayout**

`src/components/layout/MainLayout.tsx:25` usa `h-screen` (= `100vh`). No iOS Safari, isso causa overflow de viewport quando a barra de URL aparece/desaparece. Padrão moderno: `h-dvh` (dynamic viewport height).

**3. `mb-mobile-nav` usa `margin-bottom` em vez de `padding-bottom`**

`src/index.css:472-477` aplica `margin-bottom: calc(4rem + safe-area-inset-bottom)` no `<main>`. Margem em elemento com `min-h-full` dentro de container `overflow-auto` pode colapsar ou ser ignorada em alguns motores. **`padding-bottom` é mais robusto** e garante que o conteúdo nunca seja cortado.

### Correções planejadas

**A. Centralizar scroll no MainLayout (eliminar scroll duplo)**

Remover `h-[calc(100vh-4rem)] overflow-auto` das 5 páginas. O scroll já é provido pelo `SwipeableView` (`flex-1 overflow-auto`). Substituir por classes simples (`space-y-6` quando necessário).

```diff
- <div className="page-container space-y-6 h-[calc(100vh-4rem)] overflow-auto">
+ <div className="page-container space-y-6">
```

**B. Trocar `h-screen` por `h-dvh` com fallback**

`src/components/layout/MainLayout.tsx` e `src/layouts/MainLayout.tsx`:
```diff
- <div className="flex h-screen bg-background">
+ <div className="flex h-screen h-[100dvh] bg-background">
```
A segunda classe sobrescreve em browsers que suportam `dvh`; mantém compatibilidade.

**C. Converter `mb-mobile-nav` para padding (mais seguro)**

`src/index.css`:
```diff
  .mb-mobile-nav { @apply mb-0 md:mb-0; }
  @media (max-width: 767px) {
    .mb-mobile-nav {
-     margin-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
+     padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
    }
  }
```
Como o `<main>` já tem `p-4` e `min-h-full`, padding extra inferior empilha corretamente sem colapso de margem.

**D. Reforçar script de checagem**

Estender `scripts/check-mobile-nav.mjs` para também alertar sobre o anti-padrão `h-[calc(100vh-` em páginas (causa scroll duplo). Lista isso como "drift de scroll" separado, com mensagem explicativa.

### Validação pós-mudança

1. `npm run check:mobile-nav` — deve passar e listar 0 ocorrências de scroll duplo
2. `npx tsc --noEmit` — sem erros
3. **QA visual via browser** (após sua aprovação): viewport 390×844 (iPhone 12), navegar Dashboard → Cameras → Alerts → Settings, scrollar até o fim de cada página, screenshot confirmando que o último item fica visível acima do BottomNavigation com folga do safe-area-inset

### Arquivos editados

- ✏️ `src/index.css` (margin → padding em `mb-mobile-nav`)
- ✏️ `src/components/layout/MainLayout.tsx` (`h-dvh` fallback)
- ✏️ `src/layouts/MainLayout.tsx` (`h-dvh` fallback)
- ✏️ `src/pages/SettingsPage.tsx`, `SecurityPage.tsx`, `AlertsPage.tsx`, `DashboardV2.tsx`, `CamerasPage.tsx` (remover scroll duplicado)
- ✏️ `scripts/check-mobile-nav.mjs` (detectar `h-[calc(100vh-` em pages)
- ✏️ `docs/LAYOUTS.md` seção 11 (anotar regra anti-scroll-duplo)
- ✏️ `mem://style/mobile-layout-compatibility` + `mem://standards/mobile-nav-checklist` (atualizar)

### Riscos

- **Risco:** páginas que dependiam do `h-[calc(100vh-4rem)]` para layout interno (ex.: lista com altura fixa + filtros sticky) podem perder comportamento esperado.
  - **Mitigação:** após remoção, abrir cada uma das 5 páginas em viewport mobile + desktop; se algum filtro precisava ser sticky, aplicar `sticky top-0` no header interno em vez de altura fixa no container raiz.

