# MediaMTX e streaming de câmera — VISÃO V2

Ler ao mexer em stream, player, câmera, HLS/WebRTC/RTSP, gravação ou credencial de câmera.
Detalhe de deploy do servidor em `docker/README.mediamtx.md` (fonte de verdade de portas e config).

## 1. Caminho obrigatório do front até o MediaMTX

O browser **nunca** fala com a Control API do MediaMTX (porta 9997). O front chama a edge function
`mediamtx-proxy`, que autentica no Supabase e só então fala com o MediaMTX pela rede interna.

- Front lê exatamente três variáveis, consumidas por `src/hooks/useMediaMTX.ts`:
  `VITE_MEDIAMTX_HLS_URL`, `VITE_MEDIAMTX_WEBRTC_URL`, `VITE_MEDIAMTX_RTSP_URL`.
  Os nomes são cobrados por `npm run check:env-contract` — se renomear, o gate quebra.
- `MEDIAMTX_API_URL`, `MEDIAMTX_API_USER`, `MEDIAMTX_API_PASS` são **só** da edge. Nunca com prefixo `VITE_`.

## 2. Gates que você não pode remover

`npm run check:mediamtx-path-contract` (roda no `prebuild`) verifica estaticamente que o
`mediamtx-proxy/index.ts` continua: importando `mediamtxPath.ts`; chamando `sanitizePathName` antes de
montar URL de controle; usando `validatePathBody` na action `add`; usando `DELETE` para remover (não
`POST /remove/`); mascarando segredos no log; e lendo `MEDIAMTX_API_URL` do env. E que `mediamtxPath.ts`
mantém a regex `RUN_ON` (anti-RCE), `DANGEROUS_KEYS` (anti-prototype-pollution) e os bloqueios de
`file://` e `169.254.169.254` (anti-SSRF de metadata de nuvem).

`npm run check:no-plain-rtsp`: nenhuma edge pode fazer `select(... stream_url ...)` na tabela `cameras`.
Allowlist de duas funções, donas legítimas do dado: `camera-credentials-vault` e `resolve-camera-url`
(`scripts/check-no-plain-rtsp.mjs:9`). Precisa da URL com credencial? Chame a vault, não a tabela.

Se um desses gates barrar seu patch, o patch está errado — não suprima o gate.

## 3. Deploy do servidor de mídia

| Arquivo                                    | Uso                                                      |
| ------------------------------------------ | -------------------------------------------------------- |
| `docker/docker-compose.mediamtx.yml`       | single-host (bridge), dev                                |
| `docker/docker-compose.mediamtx.swarm.yml` | **produção em Docker Swarm**, portas em `mode: host`     |
| `docker/mediamtx.yml`                      | config principal hardened (auth interna, paths fechados) |
| `docker/mediamtx-recording.yml`            | config de gravação usada pelo stack Swarm                |
| `docker/upload-segment.sh`                 | sidecar: sobe segmento fechado → verifica → apaga local  |

Validado contra `bluenviron/mediamtx` **v1.18.2**. A porta de mídia ICE **8189/udp** tem de ser publicada
em `mode: host`: no modo padrão o ingress routing mesh do Swarm faz SNAT e o WebRTC não flui
(`docker/README.mediamtx.md:20-24`). Mexer nesse stack = chame o dono antes de mergear.

## 4. Edges do domínio de câmera (não reimplemente)

`camera-credentials-vault` (única dona da credencial), `resolve-camera-url`, `camera-port-probe`,
`camera-health-monitor`, `camera-io-control`, `camera-ptz-control`, `onvif-*`, `device-connect`,
`device-commands`, `firmware-fingerprint`, `agent-pair`/`agent-ingest` (agente na rede do cliente),
`archive-warm-to-cold` e `evidence-seal` (ver `regras-dominio.md`).

## 5. Carga

`npm run loadtest:cameras` (`scripts/run-camera-load-test.mjs`), `loadtest:cameras:dry` para ensaio sem
tocar nada, e `loadtest:cameras:k6` (`tests/load/k6-camera-previews.js`). Teste de carga contra produção
só com o dono: abre stream de verdade e consome banda do cliente.
