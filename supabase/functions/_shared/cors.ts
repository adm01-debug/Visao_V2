const ALLOWED_ORIGINS = [
  "https://id-preview--837595d9-3a7f-4e37-9433-f7e4909f201a.lovable.app",
  "https://837595d9-3a7f-4e37-9433-f7e4909f201a.lovableproject.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:3000",
];

function getAllowedOrigin(req?: Request): string {
  const origin = req?.headers?.get("origin") ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  if (/^https:\/\/.*\.lovable\.app$/.test(origin) || /^https:\/\/.*\.lovableproject\.com$/.test(origin)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
}

export function getCorsHeaders(req?: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(req),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-request-id",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

/** @deprecated Use getCorsHeaders(req) for dynamic origin validation */
export const corsHeaders = getCorsHeaders();

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }
  return null;
}

export function addCorsHeaders(response: Response, req?: Request): Response {
  const headers = getCorsHeaders(req);
  const newHeaders = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}
