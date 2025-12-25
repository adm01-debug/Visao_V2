import { ENV } from './env';

export const SUPABASE_CONFIG = {
  url: ENV.SUPABASE_URL,
  anonKey: ENV.SUPABASE_ANON_KEY,
  options: {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    realtime: { params: { eventsPerSecond: 10 } },
  },
};
