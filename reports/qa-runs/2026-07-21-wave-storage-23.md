# QA — Onda Storage 23 (Multi-Vantage-Point Probes)

**Data:** 2026-07-21
**Simulação:** `scripts/simulate-wave-storage-23-scenarios.mjs`

## Resultados
- Checks estruturais: **26/26** ✅
- Cenários simulados: **600/600** ✅ (misfires: 0)
- Regiões cobertas: us-east-1, eu-west-1, sa-east-1

## Entregas
- `observability/blackbox/prometheus-scrape.yml` — 3 jobs regionais com label `region`.
- `observability/prometheus/visao-tiering.rules.yml` — grupo `visao-blackbox-regional`:
  - `VisaoBlackboxRegionalDivergence` (warning, 5m) — partial outage por PoP.
  - `VisaoBlackboxGlobalOutage` (critical, 3m) — todas as regiões DOWN.
- `docs/runbooks/VisaoBlackboxRegionalDivergence.md` — diagnóstico DNS/TLS/BGP por região.
- `docs/runbooks/README.md` — índice atualizado.

## Gaps prevenidos
1. Divergência regional não mascara `VisaoBlackboxProbeFailed` por região (validado).
2. Regex `job=~"visao-blackbox-https.*"` federa qualquer futuro PoP sem re-editar regra.
3. Global outage exige `for: 3m` (evita flap de deploy) enquanto divergência exige 5m.
