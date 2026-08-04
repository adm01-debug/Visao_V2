// Edge Function: nvr-recording-convert
// Converte um arquivo baixado do NVR (formato proprietário, ex.: .dav Dahua)
// para MP4 padrão (H.264/AAC container ISO-BMFF) usando ffmpeg.wasm.
//
// Estratégia:
//   1. Baixa o arquivo original de `nvr-recordings/{userId}/{id}.<ext>`.
//   2. Tenta remux com `-c copy -movflags +faststart` (rápido, sem re-encode).
//      Funciona para .dav Dahua com H.264/H.265 nativos.
//   3. Se o remux falhar (codec incompatível), faz re-encode leve
//      (`-c:v libx264 -preset veryfast -crf 23 -c:a aac`).
//   4. Faz upload para `nvr-recordings/{userId}/{id}.mp4` e atualiza a linha
//      com `converted_storage_path`, `converted_bytes` e `conversion_status`.
//
// Ações (POST JSON):
//   { action: "convert", download_id: "<uuid>", force?: boolean }
//   { action: "status",  download_id: "<uuid>" }
//
// Restrições:
//   - Runtime Deno em edge é single-threaded. Cap de MAX_INPUT_BYTES para
//     evitar OOM (~256 MiB de heap em edge).
//   - Formatos considerados "proprietários" e que exigem conversão:
//     .dav, .264, .h264, .h265, .hevc, .ps, .mkv (parcial), .flv (parcial).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
// ffmpeg.wasm — build single-thread (não requer SharedArrayBuffer).
// Usamos import dinâmico para não penalizar cold-start de ações sem conversão.

const BUCKET = 'nvr-recordings';
const MAX_INPUT_BYTES = 512 * 1024 * 1024; // 512 MiB — teto conservador do wasm.
const PROPRIETARY_EXTS = new Set(['dav', '264', 'h264', 'h265', 'hevc', 'ps']);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function extOf(path: string | null | undefined): string {
  if (!path) return '';
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot + 1).toLowerCase() : '';
}

export function isProprietary(format: string | null | undefined): boolean {
  if (!format) return false;
  return PROPRIETARY_EXTS.has(format.toLowerCase());
}

async function loadFfmpeg() {
  // @ts-ignore — módulo remoto ESM
  const mod = await import('https://esm.sh/@ffmpeg/ffmpeg@0.12.15?bundle');
  // @ts-ignore
  const util = await import('https://esm.sh/@ffmpeg/util@0.12.2?bundle');
  const ffmpeg = new mod.FFmpeg();
  const coreBase = 'https://esm.sh/@ffmpeg/core@0.12.6/dist/esm';
  await ffmpeg.load({
    coreURL: await util.toBlobURL(`${coreBase}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await util.toBlobURL(`${coreBase}/ffmpeg-core.wasm`, 'application/wasm'),
  });
  return { ffmpeg, util };
}

async function runConversion(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  downloadId: string,
  sourcePath: string,
  sourceFormat: string
): Promise<void> {
  await supabaseAdmin
    .from('nvr_recording_downloads')
    .update({
      conversion_status: 'converting',
      conversion_error: null,
    })
    .eq('id', downloadId);

  // 1. Baixa o original.
  const { data: blob, error: dlErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(sourcePath);
  if (dlErr || !blob) throw dlErr ?? new Error('Falha ao baixar arquivo original');

  const size = blob.size;
  if (size > MAX_INPUT_BYTES) {
    throw new Error(
      `Arquivo ${(size / 1024 / 1024).toFixed(0)} MiB excede limite de conversão (${
        MAX_INPUT_BYTES / 1024 / 1024
      } MiB). Baixe o original e converta localmente com ffmpeg.`
    );
  }

  const inputBytes = new Uint8Array(await blob.arrayBuffer());
  const inName = `in.${sourceFormat}`;
  const outName = 'out.mp4';

  // 2. Carrega ffmpeg.wasm e escreve o arquivo virtual.
  const { ffmpeg } = await loadFfmpeg();
  await ffmpeg.writeFile(inName, inputBytes);

  // 3. Tenta remux (rápido, sem re-encode).
  let remuxOk = false;
  try {
    const code = await ffmpeg.exec([
      '-y',
      '-i',
      inName,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outName,
    ]);
    remuxOk = code === 0;
  } catch (_e) {
    remuxOk = false;
  }

  // 4. Fallback: re-encode leve.
  if (!remuxOk) {
    try {
      await ffmpeg.deleteFile(outName).catch(() => {});
    } catch (_e) {
      /* ignora */
    }
    const code = await ffmpeg.exec([
      '-y',
      '-i',
      inName,
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-c:a',
      'aac',
      '-movflags',
      '+faststart',
      outName,
    ]);
    if (code !== 0) {
      throw new Error(`ffmpeg saiu com código ${code} (remux e re-encode falharam)`);
    }
  }

  const outBytes = (await ffmpeg.readFile(outName)) as Uint8Array;
  await ffmpeg.deleteFile(inName).catch(() => {});
  await ffmpeg.deleteFile(outName).catch(() => {});

  // 5. Upload do MP4 convertido.
  const targetPath = `${userId}/${downloadId}.mp4`;
  const { error: upErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(targetPath, new Blob([outBytes], { type: 'video/mp4' }), {
      contentType: 'video/mp4',
      upsert: true,
    });
  if (upErr) throw upErr;

  await supabaseAdmin
    .from('nvr_recording_downloads')
    .update({
      conversion_status: 'completed',
      converted_storage_path: targetPath,
      converted_bytes: outBytes.byteLength,
      converted_at: new Date().toISOString(),
      conversion_error: null,
    })
    .eq('id', downloadId);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Valida usuário — aceita JWT normal OU chamada interna (service role + header).
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const internalUserId = req.headers.get('x-internal-user-id');
    let userId: string;
    if (jwt && jwt === serviceKey && internalUserId) {
      userId = internalUserId;
    } else {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
      if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);
      userId = userData.user.id;
    }

    const body = await req.json();
    const action = body?.action as string;
    const downloadId = body?.download_id as string | undefined;
    if (!downloadId) return json({ error: 'download_id obrigatório' }, 400);

    // Carrega a linha e valida ownership.
    const { data: row, error: rowErr } = await supabaseAdmin
      .from('nvr_recording_downloads')
      .select(
        'id, user_id, status, storage_path, source_format, conversion_status, converted_storage_path, converted_bytes, converted_at, conversion_error'
      )
      .eq('id', downloadId)
      .maybeSingle();
    if (rowErr || !row) return json({ error: 'download não encontrado' }, 404);
    if (row.user_id !== userId) return json({ error: 'forbidden' }, 403);

    if (action === 'status') {
      return json({
        conversion_status: row.conversion_status,
        converted_storage_path: row.converted_storage_path,
        converted_bytes: row.converted_bytes,
        converted_at: row.converted_at,
        conversion_error: row.conversion_error,
      });
    }

    if (action !== 'convert') return json({ error: 'ação inválida' }, 400);

    if (row.status !== 'completed' || !row.storage_path) {
      return json({ error: 'download ainda não concluído — aguarde para converter' }, 409);
    }

    const format = row.source_format ?? extOf(row.storage_path);
    if (!isProprietary(format) && !body?.force) {
      await supabaseAdmin
        .from('nvr_recording_downloads')
        .update({
          conversion_status: 'skipped',
          conversion_error: `Formato "${format}" já é compatível com players padrão.`,
        })
        .eq('id', downloadId);
      return json({ status: 'skipped', format });
    }

    if (row.conversion_status === 'converting' && !body?.force) {
      return json({ status: 'already_running' }, 202);
    }

    // Marca pendente e roda em background.
    await supabaseAdmin
      .from('nvr_recording_downloads')
      .update({ conversion_status: 'pending', conversion_error: null })
      .eq('id', downloadId);

    // @ts-ignore — EdgeRuntime é fornecido pelo runtime Supabase
    EdgeRuntime.waitUntil(
      runConversion(supabaseAdmin, userId, downloadId, row.storage_path!, format).catch(
        async (err) => {
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[convert] falha', downloadId, msg);
          await supabaseAdmin
            .from('nvr_recording_downloads')
            .update({
              conversion_status: 'failed',
              conversion_error: msg.slice(0, 500),
            })
            .eq('id', downloadId);
        }
      )
    );

    return json({ status: 'started' }, 202);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[nvr-recording-convert] erro', msg);
    return json({ error: msg }, 500);
  }
});
