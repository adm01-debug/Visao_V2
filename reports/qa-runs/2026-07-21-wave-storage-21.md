# Onda Storage 21 — Blackbox exporter (probe externo HTTPS + SSL expiry)

**Status:** ✅ 10/10 — 25/25 checks estruturais + 300/300 cenários de threshold sem misfire.

## Entregas

- `observability/blackbox/blackbox.yml` — módulos `http_2xx_tls` (valida TLS, aceita 200/401), `http_2xx_authed` (probe end-to-end com bearer token via arquivo montado) e `icmp_ipv4`. `insecure_skip_verify: false` e `fail_if_not_ssl: true` obrigatórios.
- `observability/blackbox/prometheus-scrape.yml` — snippet de `scrape_config` job `visao-blackbox-https` com relabel padrão do blackbox_exporter, cobrindo `/functions/v1/metrics-prometheus`, `/functions/v1/health` e a app pública.
- `observability/prometheus/visao-tiering.rules.yml` — novo grupo `visao-blackbox` com 4 alertas:
  - 🔴 `VisaoBlackboxProbeFailed` (`probe_success == 0` for 3m)
  - 🟡 `VisaoBlackboxSslExpiringSoon` (<14d for 10m)
  - 🔴 `VisaoBlackboxSslExpiryCritical` (<3d for 5m)
  - 🟡 `VisaoBlackboxHighLatency` (fase processing >3s for 10m)
- `docs/runbooks/VisaoBlackboxProbeFailed.md` — runbook completo com `curl` contra `/probe?...&debug=true`, `openssl s_client`, checagem de DNS e árvore de decisão para TLS/latência/false positives.
- `docs/runbooks/README.md` — índice atualizado.
- `scripts/simulate-wave-storage-21-scenarios.mjs` — valida rules, config, snippets, runbook e 300 cenários sintéticos (probe_success + SSL expiry), garantindo que `critical` sempre implique `soon`.

## Motivação

Onda 20 blindou o exporter _por dentro_ (dead-man's switch + heartbeat). O blackbox blinda os endpoints _por fora_ — detecta problemas de rede pública, DNS, TLS quebrado e certificado expirando, categoria de falha que passa despercebida quando só se observa o backend.

## Próxima onda (22)

Dashboard Grafana dedicado a probes externos (mapa de disponibilidade multi-target + heatmap de latência TLS + gauge de dias até expiração).
