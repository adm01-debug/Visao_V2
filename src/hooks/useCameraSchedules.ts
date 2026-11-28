/**
 * Onda Shinobi 4 — Agendamentos Arm/Disarm
 * CRUD + realtime dos schedules do usuário autenticado.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export type ScheduleScope = 'camera' | 'group' | 'all';
export type ScheduleAction = 'arm' | 'disarm';
export type ScheduleStatus = 'ok' | 'error' | 'skipped';

export interface CameraSchedule {
  id: string;
  user_id: string;
  name: string;
  scope: ScheduleScope;
  camera_id: string | null;
  group_id: string | null;
  action: ScheduleAction;
  cron_expression: string;
  timezone: string;
  enabled: boolean;
  last_run_at: string | null;
  last_status: ScheduleStatus | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleInput {
  name: string;
  scope: ScheduleScope;
  camera_id?: string | null;
  group_id?: string | null;
  action: ScheduleAction;
  cron_expression: string;
  timezone?: string;
  enabled?: boolean;
}

const CRON_RE = /^\s*\S+\s+\S+\s+\S+\s+\S+\s+\S+\s*$/;

export function validateScheduleInput(s: ScheduleInput): string | null {
  if (!s.name || !s.name.trim()) return 'Nome é obrigatório';
  if (!CRON_RE.test(s.cron_expression)) return 'Expressão CRON inválida (5 campos)';
  if (s.scope === 'camera' && !s.camera_id) return 'Selecione a câmera';
  if (s.scope === 'group' && !s.group_id) return 'Selecione o grupo';
  if (s.scope === 'all' && (s.camera_id || s.group_id))
    return 'Escopo "todas" não aceita câmera/grupo';
  return null;
}

export function useCameraSchedules() {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<CameraSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSchedules([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('camera_schedules')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setSchedules((data ?? []) as CameraSchedule[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`camera-schedules-${user.id}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'camera_schedules' }, () =>
        load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  const create = useCallback(
    async (input: ScheduleInput) => {
      if (!user) return null;
      const err = validateScheduleInput(input);
      if (err) {
        toast.error(err);
        return null;
      }
      const { data, error } = await supabase
        .from('camera_schedules')
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          scope: input.scope,
          camera_id: input.scope === 'camera' ? input.camera_id! : null,
          group_id: input.scope === 'group' ? input.group_id! : null,
          action: input.action,
          cron_expression: input.cron_expression.trim(),
          timezone: input.timezone ?? 'America/Sao_Paulo',
          enabled: input.enabled ?? true,
        })
        .select()
        .single();
      if (error) {
        toast.error(error.message);
        return null;
      }
      toast.success('Agendamento criado');
      return data as CameraSchedule;
    },
    [user]
  );

  const update = useCallback(async (id: string, patch: Partial<ScheduleInput>) => {
    const { error } = await supabase.from('camera_schedules').update(patch).eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const toggle = useCallback(async (id: string, enabled: boolean) => {
    const { error } = await supabase.from('camera_schedules').update({ enabled }).eq('id', id);
    if (error) toast.error(error.message);
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('camera_schedules').delete().eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Agendamento removido');
  }, []);

  return { schedules, loading, create, update, toggle, remove };
}

/**
 * Converte bitmask de dias (bit0=Dom .. bit6=Sáb) para campo cron `dow`.
 *
 * Bitmask 0 nao tem representacao em cron de 5 campos e colidiria com "todos os
 * dias" (`*`), entao quem chama precisa recusar zero antes de montar o cron — o
 * formulario de agendamento exige ao menos um dia marcado.
 */
export function daysToCronField(bitmask: number): string {
  const days: number[] = [];
  for (let i = 0; i < 7; i++) if (bitmask & (1 << i)) days.push(i);
  if (days.length === 0) return '*';
  if (days.length === 7) return '*';
  return days.join(',');
}

/** Monta cron de 5 campos para horário fixo (HH:MM) em dias selecionados. */
export function buildDailyCron(hour: number, minute: number, dowBitmask: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(hour)));
  const m = Math.max(0, Math.min(59, Math.floor(minute)));
  return `${m} ${h} * * ${daysToCronField(dowBitmask)}`;
}
