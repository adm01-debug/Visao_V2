## Validar overlap da BottomNavigation em múltiplas posições de scroll

Hoje todos os specs (`mobile-nav-overlap`, `mobile-nav-content-overlap`, `mobile-nav-measured-overlap`) só verificam overlap após `scrollTop = scrollHeight`. Isso esconde casos onde elementos com `position: sticky`, modais inline, FABs ou banners flutuantes cobrem conteúdo no **topo** ou **meio** do scroll, mas ficam fora da viewport no fim.

### Implementação

**Novo spec: `tests/e2e/mobile-nav-scroll-positions.spec.ts`**

- Para cada rota crítica × posição de scroll (`top` 0%, `middle` 50%, `bottom` 100%):
  1. `gotoAuthenticated` + `waitForVisualStable`.
  2. Mede `scrollHeight` real do `[data-app-scroll]` (fallback `window`).
  3. Posiciona scroll no offset alvo (`top: 0`, `middle: (scrollHeight - vh) / 2`, `bottom: scrollHeight`).
  4. Aguarda 350ms para virtual lists / lazy renders estabilizarem.
  5. Mede altura dinâmica da nav via `measureBottomNav` (helper existente).
  6. Coleta elementos visíveis na viewport (interativos + texto significativo) com `getBoundingClientRect`.
  7. Filtra os que cruzam `navTop` com tolerância de 4px.
  8. Falha listando os 5 primeiros (tag, texto, seletor, overlapPx, scrollPosition).

**Rotas cobertas (8, alto volume de conteúdo scrollável):**
`/dashboard`, `/cameras`, `/alerts`, `/alerts-timeline`, `/heatmap`, `/analytics`, `/recordings`, `/people`.

**Estrutura de teste:**

```ts
for (const route of ROUTES) {
  for (const pos of ['top', 'middle', 'bottom'] as const) {
    test(`${route} @ scroll=${pos} — sem overlap com BottomNav`, async ({ page }) => {
      ...
    });
  }
}
```

**Mensagem de falha estruturada:**

```
[mobile-nav-scroll-positions] /dashboard @ middle (scrollTop=1240/2480)
  navTop=752, navHeight=60, scanned=42, overlaps=2
  1. <button> "Ver detalhes" → button.card-action (bottom=778, overlap=26px)
  2. <a> "Câmera 03" → a.camera-link (bottom=765, overlap=13px)
```

**Script npm:**

- Adicionar `"test:mobile-nav-scroll-positions": "playwright test tests/e2e/mobile-nav-scroll-positions.spec.ts --project=mobile-safari"` em `package.json`.

**Reuso de helpers existentes (sem duplicação):**

- `gotoAuthenticated` (helpers/authSession)
- `measureBottomNav` (helpers/measureBottomNav)
- `waitForVisualStable` (helper de estabilidade já existente)

### Diferencial vs specs atuais

| Spec                                   | Posição de scroll testada    |
| -------------------------------------- | ---------------------------- |
| `mobile-nav-padding`                   | implícito (padding estático) |
| `mobile-nav-overlap`                   | apenas fim                   |
| `mobile-nav-content-overlap`           | apenas fim                   |
| `mobile-nav-measured-overlap`          | apenas fim                   |
| **novo `mobile-nav-scroll-positions`** | **topo + meio + fim**        |

Captura overflow de elementos sticky/fixed/absolute que aparecem só em scroll parcial — falha invisível para a suíte atual.

### Memória

Atualizar `mem://testing/e2e-infrastructure` referenciando o novo spec e criar `mem://testing/mobile-nav-scroll-positions` descrevendo algoritmo + cobertura.

### Riscos & mitigações

- **Virtual lists podem renderizar elementos diferentes em cada posição** → tolerância 4px + scan apenas de elementos `visibility: visible` e dimensões `> 4px`.
- **Animações de entrada (fade/slide) durante scroll** → `waitForTimeout(350)` + `animations: 'disabled'` no contexto Playwright.
- **Skip controlado quando rota redireciona para `/auth`** → reuso do retorno booleano de `gotoAuthenticated`.
