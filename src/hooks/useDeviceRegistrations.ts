/**
 * Onda 190 — Conexão por Registro (camada de dados).
 *
 * Toda escrita passa pelas rotinas seguras do banco (`enroll_device`,
 * `rotate_device_secret`, `revoke_device`): a tabela é somente-leitura para o
 * aplicativo. O segredo em claro existe apenas no retorno da chamada — nunca é
 * relido, nunca é persistido no cliente.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { DeviceStatus } from '@/lib/devices/deviceEnrollment';

export interface DeviceRow {
  id: string;
  deviceCode: string;
  label: string;
  status: DeviceStatus;
  secretVersion: number;
  secretIssuedAt: string;
  rotatedAt: string | null;
  expiresAt: string | null;
  lastSeenAt: string | null;
  createdAt: string;
}

/** Segredo revelado uma única vez, logo após inscrição ou rotação. */
export interface RevealedSecret {
  deviceCode: string;
  secret: string;
  version: number;
}

interface DeviceRecord {
  id: string;
  device_code: string;
  label: string;
  status: string;
  secret_version: number;
  secret_issued_at: string;
  rotated_at: string | null;
  expires_at: string | null;
  last_seen_at: string | null;
  created_at: string;
}

const toStatus = (value: string): DeviceStatus =>
  value === 'active' || value === 'revoked' ? value : 'pending';

export function useDeviceRegistrations() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setDevices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('device_registrations')
      .select(
        'id, device_code, label, status, secret_version, secret_issued_at, rotated_at, expires_at, last_seen_at, created_at',
      )
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Não foi possível carregar os dispositivos registrados.');
      setLoading(false);
      return;
    }

    setDevices(
      ((data ?? []) as DeviceRecord[]).map((row) => ({
        id: row.id,
        deviceCode: row.device_code,
        label: row.label,
        status: toStatus(row.status),
        secretVersion: row.secret_version,
        secretIssuedAt: row.secret_issued_at,
        rotatedAt: row.rotated_at,
        expiresAt: row.expires_at,
        lastSeenAt: row.last_seen_at,
        createdAt: row.created_at,
      })),
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const enroll = useCallback(
    async (label: string, ttlHours: number | null) => {
      const { data, error } = await supabase.rpc('enroll_device', {
        p_label: label,
        p_ttl_hours: ttlHours ?? undefined,
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        toast.error(error?.message ?? 'Falha ao inscrever o dispositivo.');
        return false;
      }
      setRevealed({ deviceCode: row.device_code, secret: row.device_secret, version: 1 });
      toast.success('Dispositivo inscrito. Copie o segredo agora — ele não será exibido de novo.');
      await load();
      return true;
    },
    [load],
  );

  const rotate = useCallback(
    async (registrationId: string) => {
      const { data, error } = await supabase.rpc('rotate_device_secret', {
        p_registration_id: registrationId,
      });
      const row = Array.isArray(data) ? data[0] : null;
      if (error || !row) {
        toast.error(error?.message ?? 'Falha ao trocar o segredo.');
        return false;
      }
      setRevealed({
        deviceCode: row.device_code,
        secret: row.device_secret,
        version: row.secret_version,
      });
      toast.success('Segredo trocado. O anterior vale por mais 5 minutos.');
      await load();
      return true;
    },
    [load],
  );

  const revoke = useCallback(
    async (registrationId: string, reason: string | null) => {
      const { data, error } = await supabase.rpc('revoke_device', {
        p_registration_id: registrationId,
        p_reason: reason ?? undefined,
      });
      if (error) {
        toast.error(error.message);
        return false;
      }
      toast[data === true ? 'success' : 'info'](
        data === true ? 'Dispositivo revogado.' : 'Dispositivo já estava revogado.',
      );
      await load();
      return true;
    },
    [load],
  );

  const activeCount = useMemo(
    () => devices.filter((d) => d.status === 'active').length,
    [devices],
  );

  return {
    devices,
    loading,
    activeCount,
    revealed,
    dismissRevealed: () => setRevealed(null),
    enroll,
    rotate,
    revoke,
    reload: load,
  };
}
