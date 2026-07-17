/**
 * VISÃO - archive-warm-to-cold
 * Job admin-only. Move media_assets warm (>=30d desde promoted_at) para AWS S3 Glacier.
 *
 * Fluxo por asset:
 *  1) SELECT ... elegíveis (storage_tier='warm', legal_hold=false, promoted_at <= now-30d,
 *     retention_class IN ('extended','forensic'))
 *  2) Baixa via URL assinada do R2 (bucket warm — sem SDK, aws4fetch SigV4 GET)
 *  3) Confere SHA-256
 *  4) PUT no S3 com x-amz-storage-class = DEEP_ARCHIVE (ou config)
 *  5) UPDATE condicional: storage_tier='cold', archived_at=now(), storage_class=<sc>,
 *     bucket=<s3 bucket>, object_key=<key>
 *  6) DELETE do objeto warm no R2
 *  7) Rollback: se UPDATE falhar → DELETE do objeto no S3
 *
 * Secrets exigidos:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_WARM_BUCKET  (leitura)
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_COLD_BUCKET   (escrita)
 * Opcional:
 *   S3_COLD_STORAGE_CLASS (default DEEP_ARCHIVE; aceita GLACIER, GLACIER_IR)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";
import { getCorsHeaders, handleCors } from "../_shared/cors.ts";
import { createLogger } from "../_shared/logger.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";

const logger = createLogger("archive-warm-to-cold");

const VALID_STORAGE_CLASSES = new Set(["GLACIER", "DEEP_ARCHIVE", "GLACIER_IR"]);
const DEFAULT_BATCH = 20;
const MAX_BATCH = 100;
const WARM_MIN_DAYS = 30;

interface AssetRow {
  id: string;
  user_id: string;
  camera_id: string;
  bucket: string;
  object_key: string;
  size_bytes: number;
  checksum_sha256: string;
  promoted_at: string | null;
  captured_at: string;
  retention_class: string;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  const preflight = handleCors(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.strict, "archive-warm-to-cold", cors);
  if (!rl.allowed) return rl.response;

  const done = logger.time("archive-warm-to-cold");
  try {
    // ------ Config / secrets ------
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const r2AccountId = Deno.env.get("R2_ACCOUNT_ID");
    const r2AccessKey = Deno.env.get("R2_ACCESS_KEY_ID");
    const r2SecretKey = Deno.env.get("R2_SECRET_ACCESS_KEY");
    const r2Bucket = Deno.env.get("R2_WARM_BUCKET");
    const awsAccessKey = Deno.env.get("AWS_ACCESS_KEY_ID");
    const awsSecretKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
    const awsRegion = Deno.env.get("AWS_REGION");
    const s3Bucket = Deno.env.get("S3_COLD_BUCKET");
    const storageClass = Deno.env.get("S3_COLD_STORAGE_CLASS") ?? "DEEP_ARCHIVE";

    const missing: string[] = [];
    for (const [k, v] of Object.entries({
      R2_ACCOUNT_ID: r2AccountId, R2_ACCESS_KEY_ID: r2AccessKey, R2_SECRET_ACCESS_KEY: r2SecretKey, R2_WARM_BUCKET: r2Bucket,
      AWS_ACCESS_KEY_ID: awsAccessKey, AWS_SECRET_ACCESS_KEY: awsSecretKey, AWS_REGION: awsRegion, S3_COLD_BUCKET: s3Bucket,
    })) if (!v) missing.push(k);
    if (missing.length) {
      return new Response(JSON.stringify({ error: "config_missing", missing }), {
        status: 503, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    if (!VALID_STORAGE_CLASSES.has(storageClass)) {
      return new Response(JSON.stringify({ error: "invalid_storage_class", storageClass }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ------ Auth admin ------
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(supabaseUrl, supabaseAnon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (isAdmin !== true) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // ------ Payload ------
    let batch = DEFAULT_BATCH;
    let dryRun = false;
    if (req.headers.get("content-type")?.includes("application/json")) {
      try {
        const body = await req.json();
        if (typeof body?.batch === "number") batch = Math.min(MAX_BATCH, Math.max(1, body.batch));
        if (typeof body?.dry_run === "boolean") dryRun = body.dry_run;
      } catch { /* body opcional */ }
    }

    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const cutoff = new Date(Date.now() - WARM_MIN_DAYS * 86400_000).toISOString();
    const { data: candidates, error: selErr } = await admin
      .from("media_assets")
      .select("id, user_id, camera_id, bucket, object_key, size_bytes, checksum_sha256, promoted_at, captured_at, retention_class")
      .eq("storage_tier", "warm")
      .eq("legal_hold", false)
      .in("retention_class", ["extended", "forensic"])
      .lte("promoted_at", cutoff)
      .order("promoted_at", { ascending: true })
      .limit(batch);
    if (selErr) throw selErr;

    if (dryRun) {
      return new Response(JSON.stringify({ dry_run: true, candidates: candidates?.length ?? 0 }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const r2 = new AwsClient({ accessKeyId: r2AccessKey!, secretAccessKey: r2SecretKey!, service: "s3", region: "auto" });
    const s3 = new AwsClient({ accessKeyId: awsAccessKey!, secretAccessKey: awsSecretKey!, service: "s3", region: awsRegion! });
    const r2Endpoint = `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}`;
    const s3Endpoint = `https://s3.${awsRegion}.amazonaws.com/${s3Bucket}`;

    let archived = 0, skipped = 0, failed = 0;
    const errors: Array<{ id: string; reason: string }> = [];

    for (const asset of (candidates ?? []) as AssetRow[]) {
      const key = `${asset.user_id}/${asset.camera_id}/${asset.id}`;
      try {
        // 1) GET no R2 (warm)
        const getResp = await r2.fetch(`${r2Endpoint}/${asset.object_key}`, { method: "GET" });
        if (!getResp.ok) throw new Error(`r2_get_failed:${getResp.status}`);
        const bytes = new Uint8Array(await getResp.arrayBuffer());

        // 2) Integridade
        const actual = await sha256Hex(bytes);
        if (actual !== asset.checksum_sha256) {
          skipped++;
          errors.push({ id: asset.id, reason: "checksum_mismatch" });
          continue;
        }

        // 3) PUT no S3 Glacier
        const putResp = await s3.fetch(`${s3Endpoint}/${key}`, {
          method: "PUT",
          body: bytes,
          headers: {
            "content-type": "application/octet-stream",
            "x-amz-storage-class": storageClass,
            "x-amz-server-side-encryption": "AES256",
          },
        });
        if (!putResp.ok) throw new Error(`s3_put_failed:${putResp.status}`);

        // 4) UPDATE metadados (condicional para evitar corrida)
        const { error: updErr } = await admin
          .from("media_assets")
          .update({
            storage_tier: "cold",
            bucket: s3Bucket,
            object_key: key,
            archived_at: new Date().toISOString(),
            storage_class: storageClass,
            metadata: { source_bucket: asset.bucket, source_key: asset.object_key },
          })
          .eq("id", asset.id)
          .eq("storage_tier", "warm")
          .eq("legal_hold", false);
        if (updErr) {
          await s3.fetch(`${s3Endpoint}/${key}`, { method: "DELETE" }).catch(() => {});
          throw new Error(`db_update_failed:${updErr.message}`);
        }

        // 5) DELETE do warm
        const delResp = await r2.fetch(`${r2Endpoint}/${asset.object_key}`, { method: "DELETE" });
        if (!delResp.ok) logger.warn("r2_delete_failed", { id: asset.id, status: delResp.status });

        archived++;
      } catch (err) {
        failed++;
        errors.push({ id: asset.id, reason: (err as Error).message });
      }
    }

    const payload = { archived, skipped, failed, considered: candidates?.length ?? 0, storage_class: storageClass, errors };
    logger.info("archive_batch", payload);
    return new Response(JSON.stringify(payload), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    logger.error("archive_failed", { err: (err as Error).message });
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  } finally {
    done();
  }
});
