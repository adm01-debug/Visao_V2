# QA — Onda Storage 24 (SLO Multi-Window Multi-Burn-Rate)

**Data:** 2026-07-21
**Simulação:** `scripts/simulate-wave-storage-24-scenarios.mjs`

## Resultados

- Checks estruturais: **74/74** ✅
- Cenários simulados: **2600/2600** ✅ (misfires: 0)
- SLOs cobertos: `metrics_availability` (99.9%), `app_availability` (99.5%), `tiering_success` (99%), `probe_latency` (<2s)
- Burn levels: fast (14.4x), medium (6x), slow (3x)

## Entregas

- `observability/prometheus/visao-slo.recording.yml` — 23 recording rules (5m/30m/1h/6h/1d/3d/30d + budget burned + targets).
- `observability/prometheus/visao-slo.rules.yml` — 11 alerts multi-burn-rate: fast/medium/slow por SLO + latency + budget low/exhausted.
- `docs/runbooks/VisaoSloFastBurn.md` e `VisaoSloSlowBurn.md` — runbooks copy-paste (PromQL + curl + openssl).
- `observability/grafana/visao-slo-dashboard.json` — 8 painéis (budget remanescente, burn rate multi-janela, time-to-exhaustion, breakdown).
- Índice de runbooks a atualizar em seguida.

## Gaps prevenidos (validados por simulação)

1. **Anti-flap:** Sinal intermitente (short spike, long OK) NUNCA pagina — 200/200 cenários.
2. **Recuperação:** Long ruim + short recuperado NÃO pagina fast — 200/200 cenários.
3. **Positivo forte:** Ambas janelas hot SEMPRE dispara — 200/200 cenários.
4. **Boundary matemático:** Sweep de burn 0.1x..20x × 3 SLOs × 3 níveis = 1800 pontos, 0 misfires.
5. **Budget:** Detecção de 80% (warning) e 100% (freeze) validada em 100 cenários.
