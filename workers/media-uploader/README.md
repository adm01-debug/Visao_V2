# Media Uploader Worker

Container Node.js que ingere gravações contínuas do MediaMTX para o Lovable Cloud Storage via edge function `upload-media`.

## Deploy

```bash
docker run -d \
  --name media-uploader \
  -v /var/lib/mediamtx/recordings:/recordings:ro,delegated \
  -e SUPABASE_URL=https://<project>.supabase.co \
  -e SERVICE_JWT=<jwt-do-usuario-servico> \
  -e WORKER_CONCURRENCY=4 \
  --restart unless-stopped \
  node:20-alpine node /workers/media-uploader/index.mjs
```

## Escala horizontal

- Cada worker processa qualquer câmera; lock via `.uploading` marker file evita duplicidade.
- Rode 1 worker por 15-20 câmeras (~30 MB/s de ingestão sustentada).
- HPA Kubernetes por CPU > 70% ou `queue_depth` > 100.

## Observabilidade

Emite JSON no stdout a cada 30s:

```json
{
  "ts": "2026-07-17T19:40:00Z",
  "queue": 3,
  "inFlight": 2,
  "uploaded": 428,
  "failed": 1,
  "dedup": 12
}
```

Circuit breaker abre se > 50 falhas em 5 min.

## Retenção local

- Segmentos deletados imediatamente após 2xx da edge function.
- MediaMTX apaga segmentos > 24h como salvaguarda (`recordDeleteAfter`).
