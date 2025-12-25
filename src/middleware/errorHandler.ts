import { captureException } from '@/lib/errorTracking';
export const errorHandlerMiddleware = (error: Error): Response => {
  captureException(error);
  return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
};
