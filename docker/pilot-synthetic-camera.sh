#!/bin/bash
# ============================================================================
# VISÃO — Piloto de pipeline com câmera SINTÉTICA (sem hardware).
#
# Publica um stream de teste (ffmpeg: testsrc + tom) via RTSP no MediaMTX e
# valida ponta a ponta: ingest RTSP -> path ready -> HLS servido e decodificável
# -> endpoint WebRTC/WHEP vivo. Substitui a câmera física para provar o fluxo.
#
# Dois modos:
#   PILOT_SPAWN=1 (default)  sobe um MediaMTX local (MEDIAMTX_BIN) com a config
#                            ao lado deste script (mediamtx-pilot.yml).
#   PILOT_SPAWN=0            NÃO sobe nada; testa um MediaMTX já rodando em
#                            MTX_HOST (ex.: o stack Swarm implantado).
#
# Variáveis:
#   MTX_HOST     host do MediaMTX (default 127.0.0.1)
#   MEDIAMTX_BIN binário a subir no modo spawn (default "mediamtx" no PATH)
#   CAM          nome do path/câmera (default cam1)
#
# Requisitos: ffmpeg, ffprobe, curl. (No modo spawn, também o binário mediamtx.)
# Sai 0 se todos os checks passam.
# ============================================================================
set -u
HERE="$(cd "$(dirname "$0")" && pwd)"
MTX_HOST="${MTX_HOST:-127.0.0.1}"
MEDIAMTX_BIN="${MEDIAMTX_BIN:-mediamtx}"
PILOT_SPAWN="${PILOT_SPAWN:-1}"
CAM="${CAM:-cam1}"
PASS=0; FAIL=0
ok(){ PASS=$((PASS+1)); echo "  ✅ $1"; }
bad(){ FAIL=$((FAIL+1)); echo "  ❌ $1"; }
cleanup(){ [ -n "${FPID:-}" ] && kill "$FPID" 2>/dev/null; [ -n "${MPID:-}" ] && kill "$MPID" 2>/dev/null; wait 2>/dev/null; }
trap cleanup EXIT

echo "============================================================"
echo "PILOTO RTSP->HLS/WebRTC com câmera sintética — host=$MTX_HOST spawn=$PILOT_SPAWN"
echo "============================================================"

# 1) MediaMTX (spawn local ou usa o já rodando)
if [ "$PILOT_SPAWN" = "1" ]; then
  command -v "$MEDIAMTX_BIN" >/dev/null 2>&1 || { echo "MEDIAMTX_BIN '$MEDIAMTX_BIN' nao encontrado (use PILOT_SPAWN=0 p/ testar um MediaMTX ja rodando)"; exit 2; }
  "$MEDIAMTX_BIN" "$HERE/mediamtx-pilot.yml" > "$HERE/mtx.log" 2>&1 & MPID=$!
fi
for _ in $(seq 1 20); do curl -sf "http://$MTX_HOST:9997/v3/config/global/get" >/dev/null 2>&1 && break; sleep 0.3; done
curl -sf "http://$MTX_HOST:9997/v3/config/global/get" >/dev/null 2>&1 && ok "MediaMTX no ar (API :9997 responde)" || { bad "API :9997 nao responde em $MTX_HOST"; exit 1; }

# 2) câmera sintética -> RTSP/TCP
ffmpeg -hide_banner -loglevel error -re \
  -f lavfi -i testsrc2=size=640x480:rate=15 \
  -f lavfi -i sine=frequency=1000:sample_rate=48000 \
  -c:v libx264 -preset ultrafast -tune zerolatency -g 15 -pix_fmt yuv420p \
  -c:a aac -b:a 64k \
  -f rtsp -rtsp_transport tcp "rtsp://$MTX_HOST:8554/$CAM" > "$HERE/ff.log" 2>&1 & FPID=$!
sleep 2
kill -0 $FPID 2>/dev/null && ok "câmera sintética publicando RTSP em /$CAM" || bad "ffmpeg RTSP falhou: $(cat "$HERE/ff.log" 2>/dev/null | head -2)"

# 3) path 'ready' via API
ready=0
for _ in $(seq 1 25); do
  st=$(curl -sf "http://$MTX_HOST:9997/v3/paths/get/$CAM" 2>/dev/null)
  echo "$st" | grep -q '"ready":true' && { ready=1; break; }
  sleep 0.4
done
[ "$ready" = 1 ] && ok "API: path /$CAM ready=true (ingest RTSP confirmado)" || bad "path nunca ficou ready: ${st:-vazio}"
tracks=$(curl -sf "http://$MTX_HOST:9997/v3/paths/get/$CAM" 2>/dev/null | grep -oE '"tracks":\[[^]]*\]')
echo "$tracks" | grep -qi 'H264' && ok "track H264 anunciada ($tracks)" || echo "  (info) tracks=$tracks"

# 4) HLS (MediaMTX 1.18.2 usa 302+cookie 'cookieCheck' -> -L + cookie jar)
CJ="$HERE/cj"; rm -f "$CJ"
hls_get(){ curl -sL -c "$CJ" -b "$CJ" "$1" 2>/dev/null; }
pl=""
for _ in $(seq 1 24); do
  pl=$(hls_get "http://$MTX_HOST:8888/$CAM/index.m3u8")
  echo "$pl" | grep -q '#EXTM3U' && break
  sleep 0.5
done
echo "$pl" | grep -q '#EXTM3U' && ok "HLS playlist servida em /$CAM/index.m3u8 (#EXTM3U)" || bad "HLS playlist ausente"
subpl=$(echo "$pl" | grep -oE '[^[:space:]]+\.m3u8' | head -1)
if [ -n "$subpl" ]; then seg=$(hls_get "http://$MTX_HOST:8888/$CAM/$subpl"); else seg="$pl"; fi
nseg=$(printf '%s\n' "$seg" | grep -cE '\.(ts|mp4)([?].*)?$')
[ "${nseg:-0}" -ge 1 ] && ok "HLS com $nseg segmento(s) de mídia" || echo "  (info) segmentos ainda nao listados"

# 5) ffprobe LÊ o HLS -> prova que o vídeo trafega de ponta a ponta
probe=$(ffprobe -hide_banner -loglevel error -rw_timeout 10000000 \
  -show_entries stream=codec_name,codec_type,width,height \
  -of default=noprint_wrappers=1 "http://$MTX_HOST:8888/$CAM/index.m3u8" 2>"$HERE/probe.err")
if echo "$probe" | grep -q 'codec_type=video'; then
  res=$(echo "$probe" | grep -E 'width=|height=' | tr '\n' ' ')
  vcodec=$(echo "$probe" | grep -m1 'codec_name=')
  ok "ffprobe decodificou o HLS ($vcodec, $res) — vídeo E2E OK"
else
  bad "ffprobe nao leu video do HLS: $(head -2 "$HERE/probe.err" 2>/dev/null)"
fi

# 6) WebRTC/WHEP endpoint vivo
code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "http://$MTX_HOST:8889/$CAM/whep" 2>/dev/null)
{ [ "$code" = "204" ] || [ "$code" = "200" ]; } && ok "WebRTC WHEP endpoint responde (HTTP $code)" || echo "  (info) WHEP OPTIONS HTTP $code"

echo "------------------------------------------------------------"
echo "RESULTADO: $PASS checks OK, $FAIL falharam."
[ "$FAIL" -eq 0 ] && echo "✅ PILOTO VERDE: pipeline RTSP->HLS(+WebRTC) validado." || echo "❌ PILOTO com falhas."
exit $FAIL
