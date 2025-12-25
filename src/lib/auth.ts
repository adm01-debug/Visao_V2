import { supabase } from '@/integrations/supabase/client';

export const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

export const getUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const isAuthenticated = async (): Promise<boolean> => {
  const session = await getSession();
  return session !== null;
};

export const signOut = async () => {
  return supabase.auth.signOut();
};

export const refreshSession = async () => {
  const { data, error } = await supabase.auth.refreshSession();
  return { session: data.session, error };
};

export const getAccessToken = async (): Promise<string | null> => {
  const session = await getSession();
  return session?.access_token ?? null;
};
