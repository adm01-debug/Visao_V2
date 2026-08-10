/**
 * In-memory rate limiter for Edge Functions
 * Uses a sliding window approach per IP/key
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60s
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 60_000);

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  /** AI-heavy endpoints (analyze-image, detect-behavior, etc.) */
  ai: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Standard CRUD / read endpoints */
  standard: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  /** Sensitive endpoints (admin-users, send notifications) */
  sensitive: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
} as const;

function getClientKey(req: Request, prefix: string): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  return `${prefix}:${ip}`;
}

export function checkRateLimit(
  req: Request,
  config: RateLimitConfig,
  prefix: string,
  corsHeaders: Record<string, string>
): { allowed: true } | { allowed: false; response: Response } {
  const key = getClientKey(req, prefix);
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true };
  }

  entry.count++;
  if (entry.count > config.maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return {
      allowed: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests',
          retryAfterSeconds: retryAfter,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'Retry-After': String(retryAfter),
          },
        }
      ),
    };
  }

  return { allowed: true };
}
