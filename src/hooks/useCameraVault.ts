import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EmbeddedCredentialRow {
  camera_id: string;
  camera_name: string;
  user_id: string;
  masked_url: string;
  stream_url: string;
}



export function useCameraVault() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const invoke = useCallback(async <T,>(body: Record<string, unknown>): Promise<T> => {
    setLoading(true); setError(null);
    try {
      const { data, error: e } = await supabase.functions.invoke("camera-credentials-vault", { body });
      if (e) throw new Error(e.message);
      if (data?.error) throw new Error(String(data.error));
      return data as T;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "unknown_error";
      setError(msg); throw err;
    } finally { setLoading(false); }
  }, []);

  const audit = useCallback(async () => {
    const res = await invoke<{ ok: boolean; cameras: EmbeddedCredentialRow[] }>({ action: "audit" });
    return res.cameras ?? [];
  }, [invoke]);

  const storeCredentials = useCallback((camera_id: string, stream_url: string) =>
    invoke<{ ok: boolean }>({ action: "store", camera_id, stream_url }),
  [invoke]);

  const migrateBatch = useCallback((limit = 50) =>
    invoke<{ ok: boolean; migrated: number; failed: number; total: number }>({ action: "migrate_batch", limit }),
  [invoke]);

  return { loading, error, audit, storeCredentials, migrateBatch };
}
