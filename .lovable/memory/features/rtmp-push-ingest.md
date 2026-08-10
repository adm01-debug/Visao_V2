---
name: Ingestão push RTMP/SRT (Onda 124)
description: camera_ingest_endpoints + edge ingest-auth + MediaMTX hooks; câmera empurra o vídeo sem abrir portas; gate db:check:ingest-endpoints
type: feature
---

## Por que existe

Paridade com a Monuv: o instalador não precisa liberar portas no roteador nem ter IP
fixo. A câmera (ou um encoder na ponta) **empurra** o vídeo para o VISÃO.

## Modelo

`public.camera_ingest_endpoints` — um endpoint por (câmera, protocolo):

- `protocol`: `rtsp_pull` | `rtmp_push` | `srt_push`;
- `stream_key`: 32–64 chars hex, única, com CHECK de forma
  (`camera_ingest_endpoints_stream_key_shape`);
- `status`: `pending` → `publishing` → `idle`, ou `revoked` (fora do jogo);
- `stale_after_seconds`: tolerância de silêncio (60…86400, default 300);
- trigger `touch_camera_ingest_endpoints`: troca de chave grava `rotated_at` e
  devolve o endpoint para `pending` — rotacionar chave **é** cortar o publisher.

RLS por `auth.uid() = user_id`; `anon` sem nenhum privilégio (tabela e rotinas).
Privilégios padrão do papel `postgres` reconcedem tudo a `anon`/`authenticated`:
foi preciso `REVOKE ... FROM anon, authenticated` nominalmente, não só de `PUBLIC`.

## Decisão

`public.authorize_ingest_publish(_stream_key, _client_ip, _protocol)` (service_role,
SECURITY DEFINER) devolve `{allowed, reason}` com os motivos fechados:
`malformed_key`, `unknown_key`, `revoked_key`, `protocol_mismatch`. Só o caminho
autorizado incrementa `publish_count` e move `last_publish_at`.
`public.mark_ingest_unpublish(_stream_key)` fecha a sessão.

## Detecção de silêncio

`public.detect_stale_ingest_publishers()` (cron `*/5 * * * *`) emite em
`maintenance_alert_events` com `routine = 'camera_ingest_publish'`, cooldown de 6h:

- já publicou e parou → `critical` (perdemos vídeo que existia);
- nunca publicou → `warning` (instalação em andamento não é perda de sinal).

Essa mesma ordem de gravidade vive em `classifyIngestHealth` em
`src/lib/ingest/streamIngest.ts`, usada pela UI.

## Superfícies

- Edge `ingest-auth`: webhook do MediaMTX (`runOnConnect`/`runOnPublish`), protegido
  pelo segredo compartilhado `INGEST_WEBHOOK_SECRET` em `x-ingest-secret`, comparado
  em tempo constante.
- `CameraIngestPushCard` (aba "3. Envio da câmera" do `CameraSetupWizard`) e
  `useCameraIngest` — chave gerada com CSPRNG no cliente, exibida mascarada.
- Host público configurável por `VITE_MEDIA_INGEST_HOST`.

## Gate

`npm run db:check:ingest-endpoints` (dentro de `db:check:all`): RLS + policy própria,
zero privilégio para anon, unicidades, paridade literal dos CHECKs e do cooldown
com o TS, rotinas definer/service_role-only e teste funcional dos cinco vereditos
em `BEGIN; ... ROLLBACK;`.
