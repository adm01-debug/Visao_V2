# QA Run — Onda Shinobi 2: Digital Zoom no Player

**Data:** 2026-07-21
**Escopo:** Zoom digital (pan + zoom) client-side no `VideoStreamPlayer`.

## Simulação

- Script: `scripts/simulate-wave-shinobi-2-scenarios.mjs`
- Resultado: **3204/3204 checks ✅** (0 failures)
- Coberto:
  - Clamp em 8 níveis de zoom × 8 direções extremas
  - Invariante do wheel zoom (ponto sob o cursor fixo com drift < 1px)
  - 200 gestos de pinch aleatórios (clamp + bounds)
  - 100 sequências de drag pan (multi-step)
  - Round-trip de persistência (JSON) + 6 payloads inválidos rejeitados

## Novo hook

- `src/hooks/useDigitalZoom.ts` (256 linhas)
- API: `{ scale, offsetX, offsetY, transform, isZoomed, zoomIn, zoomOut, reset, on{Wheel,Pointer*,Touch*} }`
- Bounds: `scale ∈ [1, 8]` (constantes `ZOOM_MIN`/`ZOOM_MAX`)
- Persistência opcional em `localStorage` (chave `visao.zoom.<cameraId>`)
- Shortcut de teclado: `+ / - / 0` e setas para pan (quando zoomed)

## Novo componente

- `src/components/DigitalZoomOverlay.tsx`
- Toolbar flutuante top-right com `ZoomIn / ZoomOut / Reset` e indicador `Xx`
- `aria-live="polite"` no indicador; botões com `aria-label` PT-BR
- Cores 100% semânticas (`bg-foreground/60`, `text-background`) — sem hex

## Integração

- `VideoStreamPlayer` ganhou props opcionais `enableDigitalZoom` e `persistDigitalZoom` (default `false` → zero impacto em consumidores existentes).
- Wheel só rouba scroll quando `Ctrl/Shift` ou já-zoomed → não quebra scroll de página.
- Transform aplicado ao `<video>` via CSS `transform: translate() scale()` com `will-change` para GPU.
- Captura de frame para IA continua **inalterada** (usa `videoRef` puro, não a versão renderizada).

## Impacto e não-regressão

- Zoom = puramente visual → não afeta:
  - Snapshots (usam `videoWidth/videoHeight` do source)
  - Continuous analysis (frame extraído via canvas do `<video>` source)
  - Face detection
  - Clip recording
- PTZ físico (Onda anterior) permanece independente — props coexistem.

## Critérios de aceite

- [x] 400+ cenários simulados sem falha (atingido 3204/3204)
- [x] Wheel zoom com ponto focal estático (< 1px drift)
- [x] Pan não expõe fundo (clamp matemático provado)
- [x] Prop `enableDigitalZoom` isolada — default off
- [x] Sem alterações de DB / RLS
- [x] Cores semânticas + i18n PT-BR

## Próximo passo

Onda Shinobi 3 — Monitor Groups / Saved Layouts (grids 2x2/3x3/…) persistidos por usuário.
