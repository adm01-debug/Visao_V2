/**
 * Wave 6 + 9 + 10 — Cliente do wizard.
 * - Chave de idempotência estável por sessão.
 * - Aplica setup via RPC transacional.
 * - Registra telemetria (started/step/abandoned/completed).
 * - Oferece iniciar dry-run pós-conclusão.
 */
import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'visao.wizard.idempotency';

export function getWizardSessionKey(): string {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const key = `wiz-${crypto.randomUUID()}`;
  sessionStorage.setItem(SESSION_KEY, key);
  return key;
}

export function resetWizardSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

export interface WizardZoneInput {
  name: string;
  type: string;
  points: unknown;
  color?: string;
}

export interface WizardRuleInput {
  name: string;
  description?: string;
  category?: string;
  severity?: string;
  conditions?: unknown;
  actions?: string[];
  zone_id?: string | null;
  schedule_cron?: string | null;
  schedule_tz?: string;
  is_active?: boolean;
}

export async function applyCameraSetup(
  cameraId: string,
  zones: WizardZoneInput[],
  rules: WizardRuleInput[]
): Promise<{
  ok: boolean;
  camera_id: string;
  zone_ids: string[];
  rule_ids: string[];
  from_cache?: boolean;
}> {
  const idempotencyKey = getWizardSessionKey();
  const { data, error } = await supabase.functions.invoke('wizard-apply-camera-setup', {
    body: { camera_id: cameraId, zones, rules },
    headers: { 'x-idempotency-key': idempotencyKey },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as never;
}

export async function trackWizardEvent(
  event: 'started' | 'step_completed' | 'abandoned' | 'completed',
  step?: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const user_id = userRes.user?.id;
  if (!user_id) return;
  await supabase.from('wizard_telemetry').insert({
    user_id,
    wizard_name: 'camera_setup',
    event,
    step: step ?? null,
    metadata: metadata as never,
  });
}

export async function startPostWizardDryRun(
  cameraId: string,
  ruleIds: string[],
  minutes = 15
): Promise<{ session_id: string } | null> {
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user_id = userRes.user?.id;
    if (!user_id) return null;
    const expires_at = new Date(Date.now() + minutes * 60_000).toISOString();
    const { data, error } = await supabase
      .from('test_mode_sessions')
      .insert({
        user_id,
        camera_id: cameraId,
        rule_ids: ruleIds,
        expires_at,
        source: 'wizard',
      } as never)
      .select('id')
      .single();
    if (error) throw error;
    return { session_id: (data as { id: string }).id };
  } catch {
    return null;
  }
}
