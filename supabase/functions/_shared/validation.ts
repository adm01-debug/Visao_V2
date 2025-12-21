// Validation helper for Edge Functions
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateRequest<T>(
  body: unknown,
  requiredFields: (keyof T)[]
): ValidationResult {
  const errors: string[] = [];
  
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a valid object'] };
  }

  const obj = body as Record<string, unknown>;
  
  for (const field of requiredFields) {
    if (!(field as string in obj) || obj[field as string] === undefined || obj[field as string] === null) {
      errors.push(`Missing required field: ${String(field)}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateImageBase64(base64: unknown): ValidationResult {
  if (typeof base64 !== 'string') {
    return { valid: false, errors: ['Image must be a base64 string'] };
  }
  
  if (base64.length < 100) {
    return { valid: false, errors: ['Image data too short'] };
  }

  // Check for valid base64 pattern
  const base64Pattern = /^(?:data:image\/[a-z]+;base64,)?[A-Za-z0-9+/]+=*$/;
  if (!base64Pattern.test(base64.substring(0, 100))) {
    return { valid: false, errors: ['Invalid base64 image format'] };
  }

  return { valid: true, errors: [] };
}

export function rateLimitCheck(
  clientIp: string,
  limits: Map<string, { count: number; resetAt: number }>,
  maxRequests: number = 100,
  windowMs: number = 60000
): boolean {
  const now = Date.now();
  const clientLimit = limits.get(clientIp);

  if (!clientLimit || now > clientLimit.resetAt) {
    limits.set(clientIp, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (clientLimit.count >= maxRequests) {
    return false;
  }

  clientLimit.count++;
  return true;
}

export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export function errorResponse(message: string, status: number = 400): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  );
}
