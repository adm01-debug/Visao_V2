# Runbook — VisaoBlackboxRegionalDivergence / VisaoBlackboxGlobalOutage

Multi-vantage-point probes (Onda Storage 23). Três blackbox_exporters rodam em
`us-east-1`, `eu-west-1` e `sa-east-1`. As regras diferenciam três cenários:

| Cenário                                        | Alerta                            | Severidade  |
| ---------------------------------------------- | --------------------------------- | ----------- |
| Uma região DOWN, demais UP                     | `VisaoBlackboxRegionalDivergence` | 🟡 warning  |
| Todas as regiões DOWN                          | `VisaoBlackboxGlobalOutage`       | 🔴 critical |
| Região única DOWN sem multi-região configurada | `VisaoBlackboxProbeFailed`        | 🔴 critical |

## Sintomas

- Painel `visao-blackbox` mostra `probe_success` divergente por `region`.
- Usuários de uma geografia reclamam de indisponibilidade; outras funcionam.
- CDN/DNS/BGP local suspeitos (Cloudflare status, downdetector regional).

## Diagnóstico

```bash
# 1) Confirmar quais regiões estão DOWN
curl -sG "$PROM/api/v1/query" --data-urlencode \
  'query=probe_success{job=~"visao-blackbox-https.*"}' | jq '.data.result[] | {region:.metric.region, instance:.metric.instance, up:.value[1]}'

# 2) DNS por região (compare respostas)
dig +short attentive-cam.lovable.app @1.1.1.1     # US
dig +short attentive-cam.lovable.app @9.9.9.9     # EU
dig +short attentive-cam.lovable.app @8.26.56.26  # SA

# 3) TLS handshake por região
for pop in us-east eu-west sa-east; do
  echo "=== $pop ==="
  ssh blackbox-$pop 'openssl s_client -connect attentive-cam.lovable.app:443 -servername attentive-cam.lovable.app </dev/null 2>&1 | grep -E "Verify|subject|issuer"'
done

# 4) Traceroute da região afetada
ssh blackbox-<region> mtr -r -c 20 attentive-cam.lovable.app
```

## Mitigação

### Divergência regional (partial outage)

1. Se causa é DNS: forçar refresh do resolver regional.
2. Se causa é CDN/PoP: abrir ticket com Cloudflare/Vercel citando `region` e traceroute.
3. Se causa é ISP/BGP: comunicar usuários da região no status page; sem ação técnica direta.
4. Não silenciar `VisaoBlackboxProbeFailed` — cada região precisa disparar isoladamente.

### Global outage

1. Confirmar via `curl -I https://attentive-cam.lovable.app/` do laptop do operador.
2. Verificar Supabase status e Edge Functions logs.
3. Se Edge Function `metrics-prometheus` estiver DOWN, seguir `VisaoMetricsExporterDown.md`.
4. Acionar SRE on-call (PagerDuty) — Sev1.

## Escalonamento

- **critical (Global)**: PagerDuty imediato + status page público.
- **warning (Regional)**: canal Telegram Ops; escalar para Sev2 se persistir >30min.

## Pós-incidente

- Anexar prints do dashboard `visao-blackbox` filtrado por `region`.
- Registrar RCA em `reports/incidents/`.
- Se região específica repete falha, avaliar mudar de provider PoP.
