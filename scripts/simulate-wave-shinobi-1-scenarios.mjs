#!/usr/bin/env node
/**
 * Onda Shinobi 1 — Substream para Análise IA
 * Simula 320 cenários cobrindo:
 *  - Fallback substream → mainstream
 *  - Bandwidth savings (mainstream vs substream)
 *  - Falhas de rede / substream offline
 *  - Colisão de URLs / URLs inválidas
 *  - Validação de protocolo (hls/webrtc/rtsp)
 */

const PROTOCOLS = ['hls', 'webrtc', 'rtsp'];
const NETWORK_STATES = ['ok', 'timeout', 'unauthorized', 'not_found', 'malformed'];
const BITRATE_MAIN_KBPS = [2000, 3000, 4000, 6000, 8000];
const BITRATE_SUB_KBPS = [256, 384, 512, 640, 768];

function pickAnalysisStream({ mainUrl, subUrl, subState, allowFallback = true }) {
  if (subUrl && subState === 'ok') return { chosen: 'substream', url: subUrl };
  if (allowFallback && mainUrl) return { chosen: 'mainstream', url: mainUrl };
  return { chosen: 'none', url: null };
}

function isValidStreamUrl(url, protocol) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 2048) return false;
  try {
    const u = new URL(url);
    if (protocol === 'hls') return /\.m3u8($|\?)/.test(u.pathname) || u.pathname.includes('/hls');
    if (protocol === 'rtsp') return u.protocol === 'rtsp:';
    if (protocol === 'webrtc') return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol);
    return false;
  } catch {
    return false;
  }
}

let checks = 0;
let failures = 0;
const fail = (msg) => {
  failures++;
  console.error('FAIL:', msg);
};
const assert = (cond, msg) => {
  checks++;
  if (!cond) fail(msg);
};

// ── 1. Fallback matrix (5 network states × 2 fallback flags × 2 subUrl presence = 20)
for (const subState of NETWORK_STATES) {
  for (const allowFallback of [true, false]) {
    for (const hasSub of [true, false]) {
      const r = pickAnalysisStream({
        mainUrl: 'https://mtx/cam/main.m3u8',
        subUrl: hasSub ? 'https://mtx/cam/sub.m3u8' : null,
        subState,
        allowFallback,
      });
      if (hasSub && subState === 'ok') {
        assert(r.chosen === 'substream', `sub healthy should be chosen (state=${subState})`);
      } else if (allowFallback) {
        assert(r.chosen === 'mainstream', `fallback expected (sub=${hasSub}/${subState})`);
      } else {
        assert(r.chosen === 'none', `no stream when no fallback (sub=${hasSub}/${subState})`);
      }
    }
  }
}

// ── 2. Bandwidth savings (5×5 = 25)
for (const main of BITRATE_MAIN_KBPS) {
  for (const sub of BITRATE_SUB_KBPS) {
    const saving = 1 - sub / main;
    assert(saving > 0.5, `substream must save >50% bw (main=${main}, sub=${sub})`);
    assert(sub < main, `substream cannot exceed mainstream (main=${main}, sub=${sub})`);
  }
}

// ── 3. URL validation (protocol × valid/invalid × edge cases)
const urlCases = [
  ['hls', 'https://mtx.example.com/cam1/index.m3u8', true],
  ['hls', 'https://mtx.example.com/hls/cam1', true],
  ['hls', 'https://mtx.example.com/cam1', false],
  ['rtsp', 'rtsp://admin:pass@10.0.0.1:554/stream', true],
  ['rtsp', 'https://mtx/stream', false],
  ['webrtc', 'https://mtx.example.com/cam1', true],
  ['webrtc', 'wss://mtx.example.com/cam1', true],
  ['webrtc', 'ftp://x/y', false],
  ['hls', '', false],
  ['hls', null, false],
  ['hls', 'not a url', false],
  ['hls', 'https://x/'.padEnd(2100, 'a'), false],
];
for (const [p, u, expected] of urlCases) {
  assert(isValidStreamUrl(u, p) === expected, `url ${p}:${u} expected ${expected}`);
}

// ── 4. Simulate 250 random camera configs
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
for (let i = 0; i < 250; i++) {
  const protocol = rand(PROTOCOLS);
  const hasSub = Math.random() > 0.35;
  const subState = rand(NETWORK_STATES);
  const main = rand(BITRATE_MAIN_KBPS);
  const sub = rand(BITRATE_SUB_KBPS);
  const r = pickAnalysisStream({
    mainUrl: 'https://mtx/main',
    subUrl: hasSub ? 'https://mtx/sub' : null,
    subState,
    allowFallback: true,
  });
  assert(['substream', 'mainstream', 'none'].includes(r.chosen), `chosen enum #${i}`);
  if (r.chosen === 'substream') assert(sub < main, 'sub<main invariant');
}

console.log(`\n[Shinobi Wave 1] checks=${checks} failures=${failures}`);
process.exit(failures === 0 ? 0 : 1);
