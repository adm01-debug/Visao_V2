const requestCounts = new Map<string, { count: number; resetAt: number }>();
export const rateLimitMiddleware = (limit = 100, windowMs = 60000) => (ip: string): boolean => {
  const now = Date.now();
  const record = requestCounts.get(ip);
  if (!record || now > record.resetAt) { requestCounts.set(ip, { count: 1, resetAt: now + windowMs }); return true; }
  if (record.count >= limit) return false;
  record.count++; return true;
};
