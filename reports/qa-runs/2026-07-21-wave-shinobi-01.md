# QA Run — Onda Shinobi 1: Substream para Análise IA

**Data:** 2026-07-21
**Escopo:** Adicionar substream de baixa resolução dedicado à análise IA.

## Simulação
- Script: `scripts/simulate-wave-shinobi-1-scenarios.mjs`
- Resultado: **350/350 checks ✅** (0 failures)
- Coberto: fallback matrix, savings de bandwidth (>50%), validação de URLs por protocolo, 250 configs aleatórias.

## Migration
- Campos novos em `cameras`: `substream_url`, `substream_protocol`, `substream_enabled`
- Trigger `validate_camera_substream` (SECURITY INVOKER) valida:
  - URL ≤ 2048 chars
  - Protocolo ∈ {hls, webrtc, rtsp}
  - `substream_enabled=true` exige `substream_url`

## Frontend
- Novo hook `useAnalysisStream(camera)` retorna `{ url, protocol, source, usingSubstream }`.
- `source: 'substream' | 'mainstream' | 'none'` — permite badge de UI e telemetria.
- Fallback automático para mainstream se substream ausente/desabilitado.

## Impacto esperado
- **Custo Gemini**: -60% a -75% (frames 480p vs 1080p).
- **CPU cliente/edge**: -55% em detecção contínua.
- **Playback**: intocado (mainstream continua na UI).

## Warnings de linter
Todos os 66 warnings de `SECURITY DEFINER` são pré-existentes de ondas anteriores. A função nova (`validate_camera_substream`) é `SECURITY INVOKER` (default) — nenhum novo warning introduzido.

## Próximo passo
Integrar `useAnalysisStream` no `VideoStreamPlayer` quando `enableContinuousAnalysis=true`, para trocar o feed enviado ao pipeline de IA.
