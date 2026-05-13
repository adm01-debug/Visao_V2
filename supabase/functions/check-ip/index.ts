/**
 * Check IP Edge Function
 * Verifica se o IP do cliente está autorizado
 */

import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("check-ip");

const WHITELIST_ENABLED = true;
const ALLOW_LOCALHOST = Deno.env.get('ENVIRONMENT') === 'development';
const ALLOW_PRIVATE_NETWORKS = Deno.env.get('ENVIRONMENT') === 'development';

const TRUSTED_IPS: string[] = (Deno.env.get('TRUSTED_IPS') || '').split(',').filter(Boolean);
const BLOCKED_IPS: string[] = (Deno.env.get('BLOCKED_IPS') || '').split(',').filter(Boolean);
const ADMIN_IPS: string[] = (Deno.env.get('ADMIN_IPS') || '').split(',').filter(Boolean);

const isLocalhost = (ip: string): boolean => {
  return ['127.0.0.1', '::1', 'localhost'].includes(ip);
};

const isPrivateIP = (ip: string): boolean => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && (parts[1] ?? 0) >= 16 && (parts[1] ?? 0) <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
};

const getClientIP = (request: Request): string => {
  const headers = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'true-client-ip'];
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      return value.split(',')[0]?.trim() ?? 'unknown';
    }
  }
  return 'unknown';
};

const checkIPAccess = (ip: string): { allowed: boolean; reason: string; isAdmin: boolean } => {
  if (!WHITELIST_ENABLED) return { allowed: true, reason: 'Whitelist disabled', isAdmin: false };
  if (BLOCKED_IPS.includes(ip)) return { allowed: false, reason: 'IP blocked', isAdmin: false };
  if (ADMIN_IPS.includes(ip)) return { allowed: true, reason: 'Admin IP', isAdmin: true };
  if (ALLOW_LOCALHOST && isLocalhost(ip)) return { allowed: true, reason: 'Localhost', isAdmin: false };
  if (ALLOW_PRIVATE_NETWORKS && isPrivateIP(ip)) return { allowed: true, reason: 'Private network', isAdmin: false };
  if (TRUSTED_IPS.includes(ip)) return { allowed: true, reason: 'Trusted IP', isAdmin: false };
  return { allowed: false, reason: 'IP not in whitelist', isAdmin: false };
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.standard, "check-ip", corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const clientIP = getClientIP(req);
    const result = checkIPAccess(clientIP);

    const traceId = req.headers.get("x-request-id") || undefined;
    log.info("IP check", { ip: clientIP, allowed: result.allowed, reason: result.reason, traceId });

    return new Response(
      JSON.stringify({
        ip: clientIP,
        allowed: result.allowed,
        reason: result.reason,
        isAdmin: result.isAdmin,
        timestamp: new Date().toISOString(),
      }),
      {
        status: result.allowed ? 200 : 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    log.error("IP check error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(
      JSON.stringify({ error: 'Internal server error', allowed: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
