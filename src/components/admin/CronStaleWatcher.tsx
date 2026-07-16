import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useCronFreshness } from '@/hooks/useCronFreshness';

/**
 * Wave 34 — Alerta global de "cron atrasado".
 * Wave 36 — Dedup persistente em sessionStorage: não reemitir toast em navegação SPA
 * nem após reload dentro da mesma aba. Reset ao fechar aba.
 *
 * Componente headless: monta uma única vez no App e, se o usuário for admin,
 * verifica a cada 60 s a saúde dos crons `visao-*`. Dispara toast destrutivo
 * apenas UMA vez por (job, last_run) por sessão de aba.
 */
const STORAGE_KEY = 'visao:cron-stale-notified:v1';

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

  useEffect(() => {
    if (!data) return;
    let changed = false;
    for (const row of data) {
      if (row.status !== 'stale') continue;
      // Chave inclui last_run: nova execução (mesmo que ainda stale) permite realertar.
      const key = `${row.jobname}::${row.last_run ?? 'never'}`;
      if (notifiedRef.current.has(key)) continue;
      notifiedRef.current.add(key);
      changed = true;
      toast.error(`Cron atrasado: ${row.jobname}`, {
        description: `Última execução: ${row.last_run ? new Date(row.last_run).toLocaleString('pt-BR') : 'nunca'} · schedule: ${row.schedule}`,
        duration: 10_000,
      });
    }
    if (changed) persistNotified(notifiedRef.current);
  }, [data]);

  return null;
}
