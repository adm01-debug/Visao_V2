import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useCronFreshness } from '@/hooks/useCronFreshness';

/**
 * Wave 34 — Alerta global "cron atrasado".
 * Wave 36 — Dedup persistente em sessionStorage.
 * Wave 37 — Sincronização entre abas via BroadcastChannel: quando uma aba
 * emite o toast para (job,last_run), as demais abas do mesmo admin registram
 * o ack e não repetem.
 */
const STORAGE_KEY = 'visao:cron-stale-notified:v1';
const CHANNEL_NAME = 'visao:cron-stale-ack';

function loadNotified(): Set<string> {
  if (typeof window === 'undefined' || !window.sessionStorage) return new Set();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

function persistNotified(set: Set<string>): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* quota exceeded or private mode — ignore */
  }
}

export function CronStaleWatcher() {
  const { isAdmin, loading } = useUserRole();
  const { data } = useCronFreshness(isAdmin && !loading);
  const notifiedRef = useRef<Set<string>>(loadNotified());
  const channelRef = useRef<BroadcastChannel | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = ch;
    ch.onmessage = (ev: MessageEvent<{ type: 'ack'; key: string }>) => {
      if (ev.data?.type === 'ack' && typeof ev.data.key === 'string') {
        notifiedRef.current.add(ev.data.key);
      }
    };
    return () => {
      ch.close();
      channelRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    let changed = false;
    for (const row of data) {
      if (row.status !== 'stale') continue;
      const key = `${row.jobname}::${row.last_run ?? 'never'}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      changed = true;
      channelRef.current?.postMessage({ type: 'ack', key });
      toast.error(`Cron atrasado: ${row.jobname}`, {
        description: `Última execução: ${row.last_run ? new Date(row.last_run).toLocaleString('pt-BR') : 'nunca'} · schedule: ${row.schedule}`,
        duration: 10_000,
      });
    }
    if (changed) persistNotified(notifiedRef.current);
  }, [data]);

  return null;
}
