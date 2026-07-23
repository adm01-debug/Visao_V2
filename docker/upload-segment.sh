#!/bin/sh
# VISÃO — sidecar de upload de gravações do MediaMTX para object storage (R2/MinIO).
# Modelo: disco local é buffer TRANSITÓRIO. Segmento fechado -> sobe -> verifica -> apaga.
# O mecanismo primário de retenção de disco é ESTE uploader; recordDeleteAfter no
# MediaMTX é apenas backstop caso o sidecar caia.
#
# Config por env (compose) + credenciais por Swarm secret:
#   WATCH_DIR         dir observado (default /recordings)
#   SETTLE_SECONDS    idade mín. p/ considerar o segmento fechado (default 15)
#   SCAN_INTERVAL     intervalo entre varreduras (default 10)
#   RCLONE_REMOTE     nome lógico do remote rclone (default "remote")
#   REMOTE_BUCKET     bucket/container de destino (obrigatório)
#   REMOTE_PREFIX     prefixo de chave (default vazio, ex "visao/cam1/")
#   RCLONE_S3_ENDPOINT      endpoint S3 (R2/MinIO) — vira RCLONE_CONFIG_<R>_ENDPOINT
#   RCLONE_S3_PROVIDER      provider rclone (Cloudflare|Minio|AWS…) default Cloudflare
#   RCLONE_S3_REGION        região (default auto)
#   RUN_ONCE          1 = uma varredura só (testes)
# Secrets (montados pelo Swarm em /run/secrets):
#   r2_access_key, r2_secret_key
set -eu

WATCH_DIR="${WATCH_DIR:-/recordings}"
SETTLE_SECONDS="${SETTLE_SECONDS:-15}"
SCAN_INTERVAL="${SCAN_INTERVAL:-10}"
RCLONE_REMOTE="${RCLONE_REMOTE:-remote}"
REMOTE_BUCKET="${REMOTE_BUCKET:?defina REMOTE_BUCKET}"
REMOTE_PREFIX="${REMOTE_PREFIX:-}"
RUN_ONCE="${RUN_ONCE:-0}"

# Monta a config do remote rclone via env (rclone lê RCLONE_CONFIG_<NOME_MAIÚSCULO>_*).
R=$(printf '%s' "$RCLONE_REMOTE" | tr '[:lower:]' '[:upper:]')
export "RCLONE_CONFIG_${R}_TYPE=s3"
export "RCLONE_CONFIG_${R}_PROVIDER=${RCLONE_S3_PROVIDER:-Cloudflare}"
[ -n "${RCLONE_S3_ENDPOINT:-}" ] && export "RCLONE_CONFIG_${R}_ENDPOINT=${RCLONE_S3_ENDPOINT}"
export "RCLONE_CONFIG_${R}_REGION=${RCLONE_S3_REGION:-auto}"

# Credenciais: preferir Swarm secrets; assinar separado (evita SC2155 / mascarar retorno).
if [ -f /run/secrets/r2_access_key ]; then
  ak=$(cat /run/secrets/r2_access_key)
  export "RCLONE_CONFIG_${R}_ACCESS_KEY_ID=${ak}"
fi
if [ -f /run/secrets/r2_secret_key ]; then
  sk=$(cat /run/secrets/r2_secret_key)
  export "RCLONE_CONFIG_${R}_SECRET_ACCESS_KEY=${sk}"
fi

log(){ printf '{"ts":"%s","lvl":"%s","msg":"%s"}\n' "$(date -u +%FT%TZ)" "$1" "$2"; }

scan_once() {
  now=$(date +%s)
  : > /tmp/uploader.heartbeat   # healthcheck: prova de vida do loop
  # Só arquivos de mídia; .part/.tmp do MediaMTX são ignorados.
  find "$WATCH_DIR" -type f \( -name '*.mp4' -o -name '*.ts' -o -name '*.mkv' \) 2>/dev/null | while IFS= read -r f; do
    case "$f" in *.part|*.tmp) continue;; esac
    mt=$(stat -c %Y "$f" 2>/dev/null || echo "$now")
    age=$(( now - mt ))
    [ "$age" -lt "$SETTLE_SECONDS" ] && continue     # ainda sendo escrito -> pula
    rel="${f#"$WATCH_DIR"/}"
    dst="${RCLONE_REMOTE}:${REMOTE_BUCKET}/${REMOTE_PREFIX}${rel}"
    if rclone copyto --s3-no-check-bucket "$f" "$dst" 2>/tmp/rc.err; then
      if rclone check --size-only "$f" "$dst" >/dev/null 2>&1; then
        rm -f "$f" && log info "uploaded+removed:${rel}"
      else
        log warn "verify-failed-keep-local:${rel}"    # não apaga se tamanho não bateu
      fi
    else
      log error "upload-failed-retry-next-scan:${rel}:$(tail -1 /tmp/rc.err 2>/dev/null)"
    fi
  done
}

log info "uploader-start watch=${WATCH_DIR} settle=${SETTLE_SECONDS}s remote=${RCLONE_REMOTE}:${REMOTE_BUCKET}/${REMOTE_PREFIX}"
if [ "$RUN_ONCE" = "1" ]; then
  scan_once
else
  while true; do scan_once; sleep "$SCAN_INTERVAL"; done
fi
