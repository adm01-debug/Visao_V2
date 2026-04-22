

## Aviso de migração: PWA desativado e limpeza de cache

Adicionar um banner não-intrusivo que detecta resíduos do antigo PWA (service workers ou caches do Workbox) e orienta o usuário a recarregar para limpar caches stale. Mostra uma única vez por usuário, com ação clara de "Recarregar agora".

### Comportamento

- Ao montar o app, detectar:
  1. Service workers registrados (`navigator.serviceWorker.getRegistrations()`)
  2. Caches antigos do Workbox/PWA (`caches.keys()` filtrando por `workbox-`, `visao-`, `precache-`)
- Se qualquer um existir **e** o usuário ainda não dispensou o aviso (`localStorage['visao_pwa_migration_dismissed_v1']`):
  - Executar limpeza silenciosa: `unregister()` em todos SWs + `caches.delete()` nos caches detectados (já parcialmente feito no `main.tsx`, mas hoje sem feedback ao usuário).
  - Exibir banner persistente no topo do app com:
    - Ícone de aviso + título: "Atualização do sistema"
    - Texto: "O modo offline foi desativado nesta versão. Recarregue a página para remover caches antigos e garantir que você está vendo a versão mais recente."
    - Botão primário: "Recarregar agora" → `window.location.reload()`
    - Botão secundário "Dispensar" → grava flag no localStorage e oculta
- Se nenhum resíduo for detectado, banner nunca aparece (usuários novos não veem nada).

### Arquivos

**Novo: `src/components/PWAMigrationBanner.tsx`**
- Componente client-side com `useEffect` para detecção + estado local `show`
- Usa `Alert` do shadcn (`@/components/ui/alert`) com variante `default`, ícone `AlertTriangle` (lucide-react)
- Tokens semânticos HSL (sem hex hardcoded), seguindo padrão do design system
- `role="status"` + `aria-live="polite"` para acessibilidade
- Renderiza `null` quando `show=false` (sem custo visual)

**Editado: `src/components/layout/MainLayout.tsx`**
- Renderizar `<PWAMigrationBanner />` logo após o `<Header />` dentro do `<SwipeableView>`, **fora** do `<main>` para não interferir no contrato de scroll/padding
- Não afeta `mb-mobile-nav` nem `PageContent` (banner fica acima do conteúdo das páginas)

**Editado: `src/layouts/MainLayout.tsx`** (variante legada)
- Mesmo posicionamento, para consistência caso alguma rota use este layout

**Editado: `src/main.tsx`**
- Estender o bloco existente de cleanup de SWs para também limpar `caches.keys()` filtrando por prefixos conhecidos (`workbox-precache`, `workbox-runtime`, `visao-`)
- Manter logs apenas em DEV (`import.meta.env.DEV`)

**Editado: `src/constants/app.ts`**
- Adicionar `PWA_MIGRATION_DISMISSED: "visao_pwa_migration_dismissed_v1"` ao objeto `STORAGE_KEYS`

### Critérios de aceitação

- Usuário com SW antigo registrado vê o banner uma única vez ao abrir o app
- Clicar em "Recarregar agora" recarrega a página; após reload, SWs/caches removidos → banner não reaparece
- Clicar em "Dispensar" oculta e grava flag; não reaparece em sessões futuras
- Usuários sem resíduo de PWA nunca veem o banner
- Banner não quebra contrato `mb-mobile-nav` (renderizado fora de `<main>`)
- `npm run check:mobile-nav` e `npm run check:page-content` continuam passando
- Sem hex hardcoded; usa tokens semânticos do design system

### Riscos e mitigações

- **Risco:** banner aparecer em loop se cleanup falhar.
  - **Mitigação:** flag de dismiss respeitada independente do resultado do cleanup; usuário sempre pode fechar.
- **Risco:** detecção de `caches` API indisponível em browsers antigos.
  - **Mitigação:** guard `'caches' in window` antes de chamar.
- **Risco:** banner interferir com layout em mobile.
  - **Mitigação:** posicionado entre Header e `<main>` dentro do SwipeableView (já scrollável); padding interno consistente com Header.

