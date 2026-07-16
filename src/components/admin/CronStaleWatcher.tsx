import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useCronFreshness } from '@/hooks/useCronFreshness';

/**
 * Wave 34 — Alerta global de "cron atrasado".
 *
 * Componente headless: monta uma única vez no App e, se o usuário for admin,
 * verifica a cada 60 s a saúde dos crons `visao-*`. Dispara toast destrutivo
 * apenas UMA vez por job por sessão (evita spam). Reset ocorre no F5.
 *
 * Não renderiza nada visualmente — usa `sonner` como saída.
 */
export function CronStaleWatcher() {
  const { isAdmin, loading } = useUserRole();
  const { data } = useCronFreshness(isAdmin && !loading);
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;
    for (const row of data) {
      if (row.status !== 'stale') continue;
      if (notifiedRef.current.has(row.jobname)) continue;
      notifiedRef.current.add(row.jobname);
      toast.error(`Cron atrasado: ${row.jobname}`, {
        description: `Última execução: ${row.last_run ? new Date(row.last_run).toLocaleString('pt-BR') : 'nunca'} · schedule: ${row.schedule}`,
        duration: 10_000,
      });
    }
  }, [data]);

  return null;
}
