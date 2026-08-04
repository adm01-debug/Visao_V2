# Runbook — VisaoBlackboxProbeFailed / SslExpiring* / HighLatency

**Severidade:** 🔴 critical (ProbeFailed, SslExpiryCritical) • 🟡 warning (SslExpiringSoon, HighLatency) • **Serviço:** `visao-observability`

Alertas emitidos pelo `blackbox_exporter` (Onda Storage 21). Complementam o dead-man's switch da Onda 20: enquanto o dead-man vê o exporter _de dentro_, o blackbox vê os endpoints _de fora_ (rede pública, DNS, TLS, latência ponta-a-ponta).

## Sintomas

- PagerDuty: `VisaoBlackboxProbeFailed` — `probe_success == 0` por >3min em `{{ instance }}`.
- PagerDuty: `VisaoBlackboxSslExpiryCritical` — certificado expira em <3 dias.
- Chat Ops: `VisaoBlackboxSslExpiringSoon` (<14d) ou `VisaoBlackboxHighLatency` (p95 processing >3s).
- Painel Grafana `visao-tiering` sem dados vindos do target afetado.

## Diagnóstico

1. Reproduzir o probe manualmente contra o blackbox_exporter:

```bash
curl -sS "http://blackbox-exporter:9115/probe?module=http_2xx_tls&target=https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/metrics-prometheus&debug=true" | tail -80
```

2. Testar TLS e validade do certificado:

```bash
echo | openssl s_client -connect fsisdfdwlbfeadwfqpir.supabase.co:443 -servername fsisdfdwlbfeadwfqpir.supabase.co 2>/dev/null \
  | openssl x509 -noout -dates -subject -issuer
```

3. Testar alcance direto:

```bash
curl -sS -o /dev/null -w "http_code=%{http_code} tls=%{ssl_verify_result} total=%{time_total}s\n" \
  "https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/metrics-prometheus"
```

4. Conferir DNS a partir do host do blackbox:

```bash
dig +short fsisdfdwlbfeadwfqpir.supabase.co
```

## Mitigação

- **ProbeFailed com TLS OK e HTTP 401:** esperado — o módulo `http_2xx_tls` aceita 401. Se ainda assim `probe_success=0`, revisar `valid_status_codes` em `observability/blackbox/blackbox.yml`.
- **TLS quebrado / expirado:** renovar o certificado no provedor (Supabase/Lovable gerenciam auto — abrir ticket urgente); para domínio custom, disparar renovação Let's Encrypt / provedor.
- **DNS falhando:** validar resolvers do host do blackbox, checar TTL, subir mirror interno se necessário.
- **HighLatency:** cruzar com `VisaoTieringSuccessRatioLow` — se coincidirem, é degradação real do backend; abrir incidente e escalar.
- **False positive por rede corporativa:** rodar o exporter de outra região (multi-vantage-point).

## Escalonamento

- ProbeFailed >15min OU SslExpiryCritical → Sev1, PagerDuty SRE on-call.
- SslExpiringSoon → responsável de plataforma renova em <7 dias.
- HighLatency >30min → Tech Lead de Plataforma.

## Pós-incidente

- Adicionar/ajustar targets em `observability/blackbox/prometheus-scrape.yml`.
- Se o incidente foi por certificado, agendar lembrete de renovação 30 dias antes.
- RCA em `reports/incidents/`.
