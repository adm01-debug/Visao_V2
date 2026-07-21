# VISÃO — Observability Bundle (Onda Storage 18)

Arquivos versionados para provisionamento automático de Prometheus, Alertmanager e Grafana.

## Estrutura

```
observability/
├── prometheus/
│   ├── visao-tiering.rules.yml   # Regras de alerta (SLO, Glacier)
│   └── alertmanager.yml          # Roteamento por severidade
└── grafana/
    └── visao-tiering-dashboard.json  # Dashboard provisionado (uid: visao-tiering)
```

## Prometheus

Adicionar no `prometheus.yml`:

```yaml
rule_files:
  - /etc/prometheus/rules/visao-tiering.rules.yml
scrape_configs:
  - job_name: visao-tiering
    scrape_interval: 60s
    metrics_path: /functions/v1/metrics-prometheus
    scheme: https
    static_configs:
      - targets: ['<supabase-host>']
    authorization:
      type: Bearer
      credentials_file: /etc/prometheus/visao_token
```

O token vem do secret `PROMETHEUS_METRICS_BEARER_TOKEN` (Lovable Cloud).

## Alertmanager

Substituir os `*_file` por secrets reais do ambiente (`telegram_token`, `pagerduty_key`).
Roteamento: `critical` → PagerDuty; demais → Telegram Ops.
Inibição: alertas `warning` são inibidos por `critical` do mesmo `operation`/`service`.

## Grafana

Provisionar o dashboard via `dashboards/` do Grafana ou importar pelo UI usando o UID `visao-tiering`.
Variável `$operation` popula-se automaticamente a partir de `label_values(visao_tiering_slo_status, operation)`.
