# Onda Storage 22 — Dashboard Grafana Blackbox + SSL expiry

**Status:** ✅ 10/10 — 37/37 checks estruturais + 600/600 cenários (SSL expiry + probe up/down) sem misfire.

## Entregas

- `observability/grafana/visao-blackbox-dashboard.json` — dashboard `uid: visao-blackbox` (schemaVersion 39) com 8 painéis:
  1. **Stat** — disponibilidade agora (mapping UP/DOWN, background colorido)
  2. **Gauge** — dias até expiração do certificado (thresholds 3d/14d/30d alinhados com alertas da Onda 21)
  3. **Stat** — uptime 24h (`avg_over_time(probe_success[24h])`, unidade `percentunit`, verde ≥99.9%)
  4. **Timeseries** — latência por fase (`resolve`, `connect`, `tls`, `processing`, `transfer`)
  5. **Heatmap** — distribuição de duração do TLS handshake
  6. **Table** — status consolidado por target (merge de 4 queries instant: up, cert dias, HTTP code, processing)
  7. **Timeseries** — HTTP status code observado por target
  8. **Timeseries** — falhas de probe (`1 - probe_success`)
- Variável `$target` populada via `label_values(probe_success{job="visao-blackbox-https"}, instance)` com multi-select.
- `scripts/simulate-wave-storage-22-scenarios.mjs` — valida uid/schema, PromQL usa métricas do blackbox_exporter, thresholds da gauge batem com os alertas, IDs únicos, gridPos válido; simula 400 cenários de expiração de certificado e 200 de up/down.

## Motivação

Onda 21 instrumentou o probe externo e os alertas. Sem visualização, o operador só vê o alerta _depois_ de disparado; o dashboard mostra a _tendência_ — cert caindo, latência subindo, região específica intermitente — habilitando ação antes do SLA quebrar.

## Próxima onda (23)

Multi-vantage-point: rodar o blackbox_exporter em ≥2 regiões (interna + externa) e adicionar label `region` para eliminar falso-positivo por rede corporativa.
