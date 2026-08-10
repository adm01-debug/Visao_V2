# Onda 41 — Anotação de snapshot (bounding box + label + score) — paridade Frigate

**Contexto:** Frigate salva JPG do evento com o bounding box já desenhado sobre o frame. VISÃO hoje persiste o frame cru — auditoria (`docs/audits/2026-07-16-frigate-vs-visao.md`) marca como gap #2 (impacto alto para investigação de incidentes, esforço baixo).

## Simulação

500 fuzz aleatórios: frames 320×240→4096×2160, 0-10 boxes por frame com coordenadas dentro/parciais/fora/invertidas/zero-área, labels vazios/longos/unicode, scores 0-1, classes variadas. Invariantes: (1) nenhum draw fora do frame, (2) `drawn == validCount` pós-clamp, (3) cor determinística por classe, (4) função pura (mesma entrada → mesmo output). **500/500 pass**.

## Implementação

- **`src/lib/snapshotAnnotator.ts`** (novo): função pura sem I/O nem criação de canvas — recebe `CanvasRenderingContext2D`.
  - `annotateFrame(ctx, frame, detections, opts)` → nº de boxes desenhados.
  - `clampBox(box, frame)` normaliza box invertido (w/h negativos) e clampa aos limites; retorna `null` para zero-área/fora/NaN.
  - `resolveBoxColor(class, override?)` — mapa HSL determinístico por classe (`person`, `vehicle`, `plate`, `face`, `ppe`, `other`).
  - Label com fundo semi-opaco (alpha 0.7) acima do box; reposiciona dentro quando não cabe.
- **`src/lib/__tests__/snapshotAnnotator.test.ts`**: **7/7 pass** — clamp, cor determinística, ignorar inválidos, múltiplos boxes, showScore=false, reposicionamento de label.
- **`scripts/simulate-wave41-scenarios.mjs`**: fuzz 500 cenários.

## Escopo intencional

- Sem migration, sem toque em `video_clips`, sem alteração no `useClipRecorder`.
- Núcleo puro pronto para adoção incremental por: (a) edge function que gera thumbnail anotado, (b) `useClipRecorder` para overlay antes do save, (c) player de review.
- Segue padrão `clipRetention.ts` (onda 40) e `dbHealthGuard.ts` (onda 39): lib pura testável 100%, adoção diferida.

Status: **10/10** mantido. Gap #2 do audit fechado no núcleo.
