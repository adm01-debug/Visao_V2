interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function createRateLimiter(config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }) {
  return async (req: Request): Promise<{ allowed: boolean; remaining: number; resetTime: number }> => {
    const clientIP = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    
    let record = rateLimitStore.get(clientIP);
    
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + config.windowMs };
      rateLimitStore.set(clientIP, record);
    }
    
    record.count++;
    
    const allowed = record.count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - record.count);
    
    return { allowed, remaining, resetTime: record.resetTime };
  };
}

export function rateLimitResponse(resetTime: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests", retryAfter: Math.ceil((resetTime - Date.now()) / 1000) }),
    { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(Math.ceil((resetTime - Date.now()) / 1000)) } }
  );
}
