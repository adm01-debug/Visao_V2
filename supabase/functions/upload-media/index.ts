/**
 * VISÃO - upload-media
 * Recebe snapshots/clipes/segmentos contínuos, valida integridade (SHA-256),
 * faz upload no bucket hot correspondente e registra em media_assets.
 * Idempotente via checksum + rate-limited por câmera.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";

const logger = createLogger("upload-media");

const MAX_SIZE_BYTES: Record<string, number> = {
  snapshot: 10 * 1024 * 1024,       // 10 MB
  clip: 200 * 1024 * 1024,          // 200 MB
  continuous: 100 * 1024 * 1024,    // 100 MB (segmento HLS ~10s)
};

const BUCKET_BY_TYPE: Record<string, string> = {
  snapshot: "camera-snapshots",
  clip: "camera-clips",
  continuous: "camera-continuous",
};

const ALLOWED_MIME: Record<string, RegExp> = {
  snapshot: /^image\/(jpeg|png|webp)$/,
  clip: /^video\/(mp4|webm)$/,
  continuous: /^video\/(mp2t|mp4)$/,
};

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.standard, "upload-media", cors);
  if (!rl.allowed) return rl.response;

  const done = logger.time("upload-media");
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const form = await req.formData();
    const file = form.get("file");
    const type = String(form.get("type") ?? "");
    const cameraId = String(form.get("camera_id") ?? "");
    const capturedAtRaw = form.get("captured_at");
    const durationRaw = form.get("duration_seconds");
    const retentionClass = String(form.get("retention_class") ?? "standard");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!BUCKET_BY_TYPE[type]) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!cameraId || !/^[0-9a-f-]{36}$/i.test(cameraId)) {
      return new Response(JSON.stringify({ error: "Invalid camera_id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_MIME[type].test(file.type)) {
      return new Response(JSON.stringify({ error: `Invalid mime for ${type}` }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_SIZE_BYTES[type]) {
      return new Response(JSON.stringify({ error: "File too large" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const checksum = await sha256Hex(bytes);

    // Idempotência: se já existe pelo checksum + user + camera, retorna existente
    const admin = createClient(supabaseUrl, serviceRole);
    const { data: existing } = await admin
      .from("media_assets")
      .select("id, bucket, object_key, storage_tier")
      .eq("user_id", userId)
      .eq("camera_id", cameraId)
      .eq("checksum_sha256", checksum)
      .maybeSingle();

    if (existing) {
      done();
      return new Response(
        JSON.stringify({ id: existing.id, deduplicated: true, ...existing }),
        { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const bucket = BUCKET_BY_TYPE[type];
    const capturedAt = capturedAtRaw ? new Date(String(capturedAtRaw)) : new Date();
    if (Number.isNaN(capturedAt.getTime())) {
      return new Response(JSON.stringify({ error: "Invalid captured_at" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const ext = file.type.split("/")[1]?.split(";")[0] ?? "bin";
    const objectKey = `${userId}/${cameraId}/${capturedAt.getTime()}_${checksum.slice(0, 12)}.${ext}`;

    const { error: uploadErr } = await admin.storage
      .from(bucket)
      .upload(objectKey, bytes, { contentType: file.type, upsert: false });
    if (uploadErr) {
      logger.error("Upload failed", { message: uploadErr.message });
      return new Response(JSON.stringify({ error: "Upload failed", details: uploadErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const durationSeconds = durationRaw ? Number(durationRaw) : null;
    const { data: inserted, error: insertErr } = await admin
      .from("media_assets")
      .insert({
        user_id: userId,
        camera_id: cameraId,
        type,
        storage_tier: "hot",
        bucket,
        object_key: objectKey,
        size_bytes: file.size,
        duration_seconds: durationSeconds,
        mime_type: file.type,
        checksum_sha256: checksum,
        retention_class: ["standard", "extended", "forensic"].includes(retentionClass)
          ? retentionClass
          : "standard",
        captured_at: capturedAt.toISOString(),
      })
      .select("id, expires_at")
      .single();

    if (insertErr) {
      // rollback do upload em caso de erro no insert
      await admin.storage.from(bucket).remove([objectKey]);
      logger.error("DB insert failed", { message: insertErr.message });
      return new Response(JSON.stringify({ error: "DB insert failed", details: insertErr.message }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    done();
    return new Response(
      JSON.stringify({
        id: inserted.id,
        bucket,
        object_key: objectKey,
        checksum_sha256: checksum,
        expires_at: inserted.expires_at,
        deduplicated: false,
      }),
      { status: 201, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Unhandled error", { message: msg });
    return new Response(JSON.stringify({ error: "Internal error", details: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
