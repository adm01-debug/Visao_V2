# Runbook — Teste de Carga de Prévias de Câmera

> Objetivo: simular dezenas a centenas de câmeras iniciando prévias em
> paralelo para achar gargalos (Edge Functions, banco, MediaMTX) e validar
> comportamento sob rate limiting.

## Endpoints exercitados

- `POST /functions/v1/validate-rtsp-stream` — handshake RTSP + score.
- `POST /functions/v1/rtsp-preview` — ações `start` / `extend` / `stop`.

Cada câmera virtual executa o ciclo completo (`validate → start → extend →
stop`), com pacing controlado por cenário.

## Duas ferramentas, mesma cobertura

| Ferramenta      | Comando                                   | Quando usar                                                |
| --------------- | ----------------------------------------- | ---------------------------------------------------------- |
| **k6**          | `k6 run tests/load/k6-camera-previews.js` | Rodadas oficiais, geração de HTML report, `p99` confiável. |
| **Node runner** | `node scripts/run-camera-load-test.mjs`   | CI sem `k6` instalado, dry-run, integração com QA reports. |

Ambos produzem métricas equivalentes: latência p50/p95/p99 por endpoint,
contagem de `429`, taxa de erro e sessões iniciadas.

## Cenários

```text
smoke  →   5 VUs  / 30s   sanidade; roda em PR.
ramp   →   0→100 VUs / 5m  busca do joelho de performance (default).
burst  → 200 VUs instantâneos / 1m  valida rate limit + backpressure.
soak   →  40 VUs / 15m    detecta leaks de sessão / bloat de conexão.
```

## Como rodar (Node runner)

```bash
export BASE_URL="https://<project>.supabase.co"
export ANON_KEY="…"
export USER_JWT="…"            # JWT do usuário de teste (obrigatório para rtsp-preview)
export RTSP_URL="rtsp://user:pass@10.0.0.10:554/Streaming/Channels/101"

# Dry-run (sem HTTP, valida runner e formato do relatório)
node scripts/run-camera-load-test.mjs --dry-run --cameras=100 --concurrency=25

# Ramp real
node scripts/run-camera-load-test.mjs --scenario=ramp --cameras=100 --concurrency=25

# Burst (força 429)
node scripts/run-camera-load-test.mjs --scenario=burst --cameras=300 --concurrency=200
```

Relatórios são gravados em `tests/load/reports/` como `*.json` e `*.md`.
O processo termina com **exit 1** se houver gaps de SLO — pronto para gating em CI.

## Como rodar (k6)

```bash
BASE_URL="https://<project>.supabase.co" \
ANON_KEY="…" USER_JWT="…" \
RTSP_URL="rtsp://user:pass@10.0.0.10:554/Streaming/Channels/101" \
SCENARIO=ramp \
k6 run tests/load/k6-camera-previews.js
```

Instalação rápida: `nix run nixpkgs#k6 -- run …` ou `brew install k6`.

## SLOs iniciais

| Métrica             | Alvo     | Fonte                                  |
| ------------------- | -------- | -------------------------------------- |
| `validate` p95      | < 2500ms | handshake RTSP + score                 |
| `preview.start` p95 | < 3500ms | inclui provisionamento MediaMTX        |
| `preview.stop` p95  | < 1500ms | apenas cleanup                         |
| Taxa de erro        | < 5%     | fora 429 esperados em burst            |
| 429 em ramp         | 0        | rate limiter só deve disparar em burst |
| 429 em burst        | > 0      | confirma que o limiter está ativo      |

Calibre depois da primeira rodada `smoke` no ambiente alvo.

## Análise dos resultados

1. **Latência crescente com o tempo** → saturação de compute Edge ou banco.
   Consulte `supabase--db_health` (conexões, WAL, OOM) durante a corrida.
2. **429 concentrado em `validate`** → limiter `RATE_LIMITS` da função foi
   atingido; considere caching client-side de handshakes recentes.
3. **`preview.start` degrada mas `stop` não** → gargalo no MediaMTX pull
   ou na resolução via Vault (`resolve-camera-url`), não no Postgres.
4. **`previewFailed` alto sem 429** → provavelmente `mediamtx_pull_failed`
   ou `session_create_failed`; correlacione com logs de `rtsp-preview`.
5. **Erros de rede > 0** → TLS/DNS instável no runner; rode do mesmo
   região do backend.

## Segurança operacional

- **NÃO** apontar `RTSP_URL` para câmera de produção. Sempre laboratório.
- Rate limit atual do `rtsp-preview`: 30 req/min por usuário (in-memory,
  por instância). Em `burst` é esperado ver 429 — é feature, não bug.
- Cada VU chama `stop` no `finally` para evitar sessões zumbis. Se o
  processo for morto no meio (SIGKILL), rode a limpeza:
  `select public.cleanup_expired_preview_sessions();`.

## Integração em CI (opcional)

Bloco sugerido para o workflow Nightly:

```yaml
- name: Load test (smoke)
  env:
    BASE_URL: ${{ secrets.SUPABASE_URL }}
    ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    USER_JWT: ${{ secrets.E2E_USER_JWT }}
    RTSP_URL: ${{ secrets.LOADTEST_RTSP_URL }}
  run: node scripts/run-camera-load-test.mjs --scenario=smoke --cameras=10 --concurrency=5
```

## Próximas iterações

- Persistir histórico em `load_test_runs` (tabela nova, RLS por admin) para
  detectar regressões week-over-week.
- Adicionar `--profile-db` que dispara `pg_stat_statements` reset antes e
  captura top-10 queries ao final.
- Expor cenário `chaos`: intercala `simulateVideoError` para exercitar o
  path de `connection_dropped` sob carga.
