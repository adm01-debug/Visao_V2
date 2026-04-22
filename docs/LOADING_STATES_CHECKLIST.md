# Loading States Checklist (DEV/QA)

Página dedicada à validação visual rápida dos estados de carregamento, error
fallback e falha de chunk lazy do **secure-scene-scanner**.

## Acesso

- **Rota:** `/dev/loading-states` (autenticado).
- **Visibilidade:** disponível em qualquer ambiente; pensada para QA/DEV.
- **Não está no menu lateral** — acessível apenas via URL direta.

## O que cobre

| # | Estado | Onde validar |
|---|---|---|
| 1 | Skeletons branded por página (Câmeras, Alertas, Zonas) | aba **Skeletons branded** |
| 2 | `SkeletonFallback` em todas as variantes (`page`, `cards`, `table`, `filters`, `inline`) | aba **Fallback genérico** |
| 3 | Error fallback quando o branded skeleton lança no render | aba **Error fallback** |
| 4 | Lazy chunk falhou (Promise.reject no `import()`) | aba **Lazy chunk failure** + navegar para `/cameras`, `/alerts`, `/zones` |

## Como usar

1. Abra `/dev/loading-states`.
2. Para cada item da seção **Checklist**, valide visualmente o estado e clique para marcar.
3. **Skeletons branded:** confira se o grid mantém `aspect-ratio` reservado e se filtros/tabs aparecem.
4. **Fallback genérico:** alterne entre `page`, `cards`, `table`, `filters`, `inline` e confirme que cada variante combina com a região-alvo.
5. **Error fallback:** clique em **"Forçar erro no skeleton"** — o `SkeletonErrorBoundary` deve renderizar o fallback (variante `cards`) sem tela em branco.
6. **Lazy chunk failure:**
   - Selecione o modo (`cameras`, `alerts`, `zones` ou `all`) — fica persistido em `localStorage` (`visao:skeleton-fail`).
   - Navegue para `/cameras`, `/alerts` ou `/zones` e recarregue: o `import()` rejeita e o fallback genérico aparece com log no console.
   - Volte e selecione `off` para desativar.
7. Use **Resetar checklist** para zerar marcações entre runs.

## Critérios de sucesso (UX)

- ✅ Nenhum estado mostra tela em branco.
- ✅ Skeletons mantêm `aspect-ratio`/`min-h-*` (CLS = 0 ao trocar para dados).
- ✅ Filtros e tabs continuam visíveis durante o load.
- ✅ Fallback genérico tem `role="status"` + `aria-busy="true"` + `aria-label` em PT-BR.
- ✅ Logs do `SkeletonErrorBoundary` incluem `route`, `failingComponent` e `boundaryName`.

## Relacionado

- `docs/SKELETON_VALIDATION.md` — pipeline `npm run check:skeletons`.
- `src/lib/skeletonFailureFlag.ts` — flag que alimenta a aba **Lazy chunk failure**.
- `src/components/dev/SkeletonFailureToggleButton.tsx` — botão flutuante equivalente.
