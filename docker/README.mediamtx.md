# MediaMTX — Deploy (VISÃO)

Servidor de mídia RTSP → HLS/WebRTC com gravação contínua para object storage.
Validado contra o binário `bluenviron/mediamtx` **v1.18.2** (schema, portas e campos de
gravação conferidos empiricamente: 0 warnings, 0 erros).

## Arquivos

| Arquivo                             | Uso                                                            |
| ----------------------------------- | -------------------------------------------------------------- |
| `docker-compose.mediamtx.yml`       | Single-host (bridge). Dev / 1 máquina.                         |
| `docker-compose.mediamtx.swarm.yml` | **Produção em Docker Swarm.** Portas host-mode.                |
| `mediamtx.yml`                      | Config principal (hardened): auth interna, paths fechados.     |
| `mediamtx-recording.yml`            | Config de gravação (usada pelo stack Swarm via config object). |
| `upload-segment.sh`                 | Sidecar: sobe segmento fechado → verifica → apaga local.       |

## Por que um compose separado para o Swarm

No Swarm, portas publicadas no modo padrão passam pelo **ingress routing mesh**, que faz
SNAT/balanceamento. Para **WebRTC** isso quebra o ICE: o cliente recebe pacotes de um IP
diferente do negociado e a mídia UDP não flui. A porta de mídia ICE (**8189/udp**) precisa
ser publicada em `mode: host` para escapar do mesh.

Mapa de portas (conferido no binário v1.18.2):

| Porta    | Proto   | Função                                     | Publicação                     |
| -------- | ------- | ------------------------------------------ | ------------------------------ |
| 8554     | tcp     | RTSP (sinal+mídia c/ `rtspTransports=tcp`) | host                           |
| 8888     | tcp     | HLS (preview browser)                      | host                           |
| 8889     | tcp     | WebRTC HTTP (sinalização/WHEP)             | host                           |
| **8189** | **udp** | **WebRTC ICE (mídia)**                     | **host (obrigatório)**         |
| 9997     | tcp     | Control API                                | **não publicada** (só overlay) |

> ⚠️ No compose antigo, `8890/udp` estava rotulado como "WebRTC UDP" — mas **8890 é SRT**.
> A porta real de mídia WebRTC (8189/udp) nunca era exposta → WebRTC quebrado. Corrigido.

## Gravação → object storage (buffer transitório)

O disco local **não** é o repositório final; é um buffer. Fluxo:

1. MediaMTX grava segmentos fechados em `/recordings/{camera}/*.mp4` (fMP4, 10s).
2. O sidecar `recorder-uploader` (rclone) observa a pasta, e para cada segmento
   **fechado** (idade ≥ `SETTLE_SECONDS`): `copyto` → `check --size-only` → `rm` local.
   Falha de upload ou de verificação **mantém** o arquivo para retry no próximo scan.
3. `recordDeleteAfter: 1h` no MediaMTX é só **backstop**: se o sidecar cair, evita que o
   disco encha e derrube toda a gravação. Com 6 câmeras (~5,4 GB/h) 1h cabe folgado.

Lógica do uploader validada em 15 cenários / 28 asserts (parcial, concorrente, falha de
upload, falha de verify, corrupção real de tamanho, retry, paths aninhados, nomes com espaço).

## Pré-requisitos (Swarm)

**Secrets** (crie antes do deploy):

```sh
printf '%s' "<R2_ACCESS_KEY_ID>"     | docker secret create r2_access_key -
printf '%s' "<R2_SECRET_ACCESS_KEY>" | docker secret create r2_secret_key -
```

**Variáveis de ambiente** (exporte antes de `docker stack deploy`):

```sh
export VISAO_PUBLIC_HOST=203.0.113.10                 # IP/hostname PÚBLICO da VPS (ICE)
export VISAO_REC_BUCKET=visao-recordings              # bucket R2/MinIO
export VISAO_REC_PREFIX=visao/                         # prefixo de chave (opcional)
export VISAO_S3_ENDPOINT=https://<acct>.r2.cloudflarestorage.com
export VISAO_S3_PROVIDER=Cloudflare                    # ou Minio, AWS…
export VISAO_S3_REGION=auto
```

## Deploy

```sh
cd docker
docker stack deploy -c docker-compose.mediamtx.swarm.yml visao-mtx
docker service ls | grep visao-mtx
docker service logs -f visao-mtx_recorder-uploader
```

## Control API para a edge function (sem porta pública)

A Control API (:9997) **não** é publicada. A edge function `mediamtx-proxy` (Supabase)
precisa alcançá-la. Padrão recomendado — túnel de saída com `cloudflared` (bloco opcional
já no compose):

1. Crie um tunnel no Cloudflare, gere o token, e `docker secret create cf_tunnel_token -`.
2. Descomente o serviço `cloudflared` e o secret no compose.
3. Configure o hostname do tunnel (ex. `mtx-api.seu-dominio`) → `http://mediamtx:9997`.
4. Proteja o hostname com **Cloudflare Access** (service token) e aponte o secret do
   Supabase `MEDIAMTX_API_URL` para esse hostname. Assim só a edge function alcança a API,
   sem abrir nenhuma porta pública.

## Segredos do Supabase (edge function)

Defina no projeto (nunca com prefixo `VITE_`):

```
MEDIAMTX_API_URL      https://mtx-api.seu-dominio
MEDIAMTX_API_USER     <usuario da auth interna do mediamtx.yml>
MEDIAMTX_API_PASS     <senha>
MEDIAMTX_ADMIN_ROLES  admin,service_role
```
