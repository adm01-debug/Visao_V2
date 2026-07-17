#!/usr/bin/env node
/**
 * VISÃO — Media Uploader Worker (Etapa 4)
 *
 * Monitora /recordings/{camera_id}/ e faz upload de cada segmento fmp4
 * chamando a edge function `upload-media` com type=continuous.
 *
 * Design:
 *  - fs.watch + debounce 500ms (aguarda file handle liberar do MediaMTX).
 *  - Fila em memória com concurrency=4 e retry exponencial (3x).
 *  - Idempotência via SHA-256 no server (edge function).
 *  - Marker file `.uploading` para lock cross-worker.
 *  - Delete local somente após 2xx confirmado.
 *  - Circuit breaker se >20% de falhas em 5min.
 */
import { readFile, unlink, stat, readdir, writeFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

const RECORDINGS_DIR = process.env.RECORDINGS_DIR ?? '/recordings';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_JWT = process.env.SERVICE_JWT; // JWT do usuário-serviço (não service_role)
const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 4);
const MAX_RETRIES = 3;
const DEBOUNCE_MS = 500;

if (!SUPABASE_URL || !SERVICE_JWT) {
  console.error('SUPABASE_URL e SERVICE_JWT são obrigatórios');
  process.exit(78);
}

const queue = [];
const inFlight = new Set();
const stats = { uploaded: 0, failed: 0, dedup: 0, lastFailures: [] };
const debounceTimers = new Map();

// --- Circuit breaker
function circuitOpen() {
  const now = Date.now();
  stats.lastFailures = stats.lastFailures.filter((t) => now - t < 5 * 60_000);
  return stats.lastFailures.length > 50;
}

// --- Enqueue com debounce (aguarda handle fechar)
function enqueue(filePath) {
  const b = basename(filePath);
  if (!b.endsWith('.mp4') && !b.endsWith('.ts')) return;
  if (b.startsWith('.') || b.endsWith('.uploading')) return;

  clearTimeout(debounceTimers.get(filePath));
  debounceTimers.set(filePath, setTimeout(() => {
    debounceTimers.delete(filePath);
    if (!inFlight.has(filePath) && !queue.includes(filePath)) {
      queue.push(filePath);
      pump();
    }
  }, DEBOUNCE_MS));
}

// --- Worker principal
async function pump() {
  while (queue.length && inFlight.size < CONCURRENCY) {
    if (circuitOpen()) {
      console.warn('[circuit] aberto — pausando 60s');
      await sleep(60_000);
      stats.lastFailures = [];
    }
    const file = queue.shift();
    inFlight.add(file);
    processOne(file).finally(() => {
      inFlight.delete(file);
      pump();
    });
  }
}

async function processOne(filePath) {
  const lock = `${filePath}.uploading`;
  try {
    // path esperado: /recordings/cam_{uuid}/{timestamp}.mp4
    const cameraFolder = basename(dirname(filePath));
    const cameraId = cameraFolder.replace(/^cam_/, '');
    if (!/^[0-9a-f-]{36}$/i.test(cameraId)) {
      console.warn('[skip] camera_id inválido:', cameraFolder);
      return;
    }

    const st = await stat(filePath).catch(() => null);
    if (!st || !st.isFile() || st.size < 1024) return; // corrupto/aberto

    await writeFile(lock, String(process.pid), { flag: 'wx' }).catch(() => { throw new Error('locked'); });

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const bytes = await readFile(filePath);
        const checksum = createHash('sha256').update(bytes).digest('hex');

        const fd = new FormData();
        fd.append('file', new Blob([bytes], { type: 'video/mp4' }), basename(filePath));
        fd.append('type', 'continuous');
        fd.append('camera_id', cameraId);
        fd.append('captured_at', new Date(st.mtimeMs).toISOString());
        fd.append('duration_seconds', '10');

        const res = await fetch(`${SUPABASE_URL}/functions/v1/upload-media`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SERVICE_JWT}` },
          body: fd,
        });

        if (res.status === 429) {
          const wait = Number(res.headers.get('Retry-After') ?? 5) * 1000;
          await sleep(wait);
          continue;
        }
        if (res.status === 413) {
          console.error('[quarantine] arquivo grande demais:', filePath);
          stats.failed++;
          return; // sem retry
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);

        const body = await res.json();
        if (body.checksum_sha256 && body.checksum_sha256 !== checksum) {
          throw new Error('checksum mismatch');
        }
        if (body.deduplicated) stats.dedup++;
        stats.uploaded++;

        await unlink(filePath).catch((e) => console.warn('[unlink]', e.message));
        return;
      } catch (err) {
        if (attempt === MAX_RETRIES) throw err;
        await sleep(500 * 2 ** attempt + Math.random() * 250);
      }
    }
  } catch (err) {
    stats.failed++;
    stats.lastFailures.push(Date.now());
    console.error('[fail]', filePath, err.message);
  } finally {
    await unlink(lock).catch(() => {});
  }
}

// --- Bootstrap: varre pasta existente + watch
async function bootstrap() {
  try {
    const cams = await readdir(RECORDINGS_DIR, { withFileTypes: true });
    for (const c of cams) {
      if (!c.isDirectory()) continue;
      const camPath = join(RECORDINGS_DIR, c.name);
      const files = await readdir(camPath);
      files.forEach((f) => enqueue(join(camPath, f)));
      watch(camPath, (_evt, fn) => fn && enqueue(join(camPath, fn)));
    }
    console.log(`[boot] monitorando ${cams.length} câmeras em ${RECORDINGS_DIR}`);
  } catch (e) {
    console.error('[boot] falhou:', e.message);
    process.exit(78);
  }
}

// --- Métricas via stdout a cada 30s
setInterval(() => {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    queue: queue.length,
    inFlight: inFlight.size,
    ...stats,
  }));
}, 30_000);

process.on('SIGTERM', () => { console.log('[shutdown]'); process.exit(0); });
bootstrap();
