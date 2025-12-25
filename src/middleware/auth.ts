import { getSession } from '@/lib/auth';
export const authMiddleware = async (request: Request): Promise<Response | null> => {
  const session = await getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });
  return null;
};
export const requireAuth = authMiddleware;
