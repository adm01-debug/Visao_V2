import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  clampToPlan,
  normalizeAngle,
  normalizeFov,
  type MapPlacement,
  type NormalizedPoint,
} from '@/lib/emap/floorPlanGeometry';
import {
  applyStatusEvent,
  diffLedgers,
  ledgerFromSnapshot,
  reconcilePlacements,
  toMarkerStatus,
  type StatusLedger,
} from '@/lib/emap/markerStatusStream';
import {
  DEFAULT_PULSE_CONFIG,
  emptyPulseLedger,
  expirePulses,
  nextExpiry,
  pulsingCameraIds as pulsingIdsOf,
  registerPulses,
  type PulseLedger,
} from '@/lib/emap/markerPulse';
import {
  describeNotice,
  emptyNoticeState,
  evaluateNotices,
  primeNoticeState,
  type NoticeState,
} from '@/lib/emap/statusAlertPolicy';
import {
  emptySuppressionLedger,
  recordSuppressions,
  summarizeSuppressions,
  clearCameraSuppressions,
  type SuppressionLedger,
} from '@/lib/emap/suppressionLedger';
import {
  buildPlanNavigation,
  type PlanRoster,
} from '@/lib/emap/planNavigator';


export interface SitePlan {
  id: string;
  name: string;
  description: string | null;
  imagePath: string;
  imageWidth: number;
  imageHeight: number;
  isDefault: boolean;
}

export interface PlanCamera {
  id: string;
  name: string;
  status: string | null;
}

const BUCKET = 'site-plans';

interface PlacementRow {
  id: string;
  plan_id: string;
  camera_id: string;
  x: number | string;
  y: number | string;
  heading_deg: number | string;
  fov_deg: number | string;
  label: string | null;
}

const num = (value: number | string): number =>
  typeof value === 'number' ? value : Number.parseFloat(value);

export function useSitePlans() {
  const [plans, setPlans] = useState<SitePlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [rawPlacements, setRawPlacements] = useState<MapPlacement[]>([]);
  // Onda 162: o estado ao vivo de cada câmera vive num livro separado da
  // geometria. Assim, tempo real nunca move marcador nem apaga mira — ele só
  // pode repintar o estado.
  const [statusLedger, setStatusLedger] = useState<StatusLedger>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  // Onda 163: a política de aviso vive em ref porque é histórico, não é tela —
  // mudá-la não deve provocar novo render.
  const noticeStateRef = useRef<NoticeState>(emptyNoticeState());
  const previousLedgerRef = useRef<StatusLedger>({});
  // Onda 164: destaque temporário de quem piorou. Vive em estado (a tela
  // precisa repintar), mas expira por relógio, nunca por render.
  const [pulseLedger, setPulseLedger] = useState<PulseLedger>(emptyPulseLedger);
  // Onda 165: livro dos avisos retidos — transparência do anti-ruído.
  const [suppressionLedger, setSuppressionLedger] = useState<SuppressionLedger>(
    emptySuppressionLedger,
  );

  const [cameras, setCameras] = useState<PlanCamera[]>([]);
  // Onda 166: quais câmeras vivem em cada planta. Só ids — é o bastante para
  // rotular o andar sem baixar geometria de plantas que ninguém está vendo.
  const [planRoster, setPlanRoster] = useState<PlanRoster>({});
  const [planImageUrl, setPlanImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId) ?? null,
    [plans, activePlanId],
  );

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ data: planRows, error: planError }, { data: cameraRows, error: cameraError }] =
        await Promise.all([
          supabase
            .from('site_plans')
            .select('id, name, description, image_path, image_width, image_height, is_default')
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false }),
          supabase.from('cameras').select('id, name, status').order('name'),
        ]);

      if (planError) throw planError;
      if (cameraError) throw cameraError;

      const mapped: SitePlan[] = (planRows ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        imagePath: row.image_path,
        imageWidth: row.image_width,
        imageHeight: row.image_height,
        isDefault: row.is_default,
      }));

      setPlans(mapped);
      setCameras(
        (cameraRows ?? []).map((row) => ({ id: row.id, name: row.name, status: row.status })),
      );
      setStatusLedger(ledgerFromSnapshot(cameraRows ?? [], Date.now()));

      const { data: rosterRows, error: rosterError } = await supabase
        .from('site_plan_placements')
        .select('plan_id, camera_id');
      if (rosterError) {
        // O roster é enfeite do seletor: falhar aqui não pode derrubar o mapa.
        logger.warn('Falha ao carregar o resumo de câmeras por planta', rosterError);
        setPlanRoster({});
      } else {
        const roster: Record<string, string[]> = {};
        for (const row of rosterRows ?? []) {
          (roster[row.plan_id] ??= []).push(row.camera_id);
        }
        setPlanRoster(roster);
      }

      setActivePlanId((current) => current ?? mapped[0]?.id ?? null);
    } catch (cause) {
      logger.error('Falha ao carregar plantas baixas', cause);
      setError('Não foi possível carregar as plantas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  /** Baixa uma URL assinada temporária — o balde é privado por decisão de projeto. */
  useEffect(() => {
    let cancelled = false;
    if (!activePlan) {
      setPlanImageUrl(null);
      return;
    }
    void (async () => {
      const { data, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(activePlan.imagePath, 3600);
      if (cancelled) return;
      if (signError) {
        logger.error('Falha ao assinar URL da planta', signError);
        setPlanImageUrl(null);
        setError('Não foi possível abrir a imagem da planta.');
        return;
      }
      setPlanImageUrl(data?.signedUrl ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [activePlan]);

  const loadPlacements = useCallback(
    async (planId: string) => {
      const { data, error: placementError } = await supabase
        .from('site_plan_placements')
        .select('id, plan_id, camera_id, x, y, heading_deg, fov_deg, label')
        .eq('plan_id', planId);

      if (placementError) {
        logger.error('Falha ao carregar marcadores da planta', placementError);
        setError('Não foi possível carregar os marcadores.');
        return;
      }

      const cameraById = new Map(cameras.map((camera) => [camera.id, camera]));
      setRawPlacements(
        (data ?? []).map((row: PlacementRow) => {
          const camera = cameraById.get(row.camera_id);
          return {
            id: row.id,
            cameraId: row.camera_id,
            label: row.label ?? camera?.name ?? 'Câmera',
            position: clampToPlan({ x: num(row.x), y: num(row.y) }).point,
            headingDeg: normalizeAngle(num(row.heading_deg)),
            fovDeg: normalizeFov(num(row.fov_deg)),
            // Estado inicial vem do livro logo em seguida; aqui só evitamos um
            // quadro vazio no primeiro render.
            status: toMarkerStatus(camera?.status),
          };
        }),
      );
    },
    [cameras],
  );

  useEffect(() => {
    if (activePlanId) void loadPlacements(activePlanId);
    else setRawPlacements([]);
  }, [activePlanId, loadPlacements]);

  /**
   * Assinatura de tempo real do estado das câmeras.
   *
   * O carimbo usado para ordenar é o `updated_at` da própria linha — nunca o
   * relógio do navegador, que faria um evento antigo parecer novo e rebaixar
   * um alarme legítimo.
   */
  useEffect(() => {
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`emap-cameras-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'cameras' },
        (payload) => {
          const row = payload.new as { id?: string; status?: unknown; updated_at?: string } | null;
          if (!row?.id) return;
          const parsed = row.updated_at ? Date.parse(row.updated_at) : Number.NaN;
          setStatusLedger((current) => {
            const { ledger } = applyStatusEvent(current, {
              cameraId: row.id as string,
              status: row.status,
              observedAt: Number.isFinite(parsed) ? parsed : Date.now(),
            });
            return ledger;
          });
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, []);

  /**
   * Onda 163 — avisa o operador apenas do que piorou.
   *
   * A primeira carga só semeia o histórico: abrir a página com câmeras já em
   * alarme não é novidade, e disparar esse coro a cada F5 treinaria a pessoa a
   * ignorar o aviso seguinte — que pode ser o de verdade.
   */
  useEffect(() => {
    const transitions = diffLedgers(previousLedgerRef.current, statusLedger);
    previousLedgerRef.current = statusLedger;

    // O pulso segue a mesma ética do aviso: a carga inicial não pisca.
    if (noticeStateRef.current.primed && transitions.length > 0) {
      setPulseLedger((current) => registerPulses(current, transitions, Date.now()));
    }

    if (!noticeStateRef.current.primed) {
      noticeStateRef.current = primeNoticeState(
        noticeStateRef.current,
        Object.keys(statusLedger),
      );
      return;
    }
    if (transitions.length === 0) return;

    const now = Date.now();
    const { state, notices, suppressed } = evaluateNotices(
      noticeStateRef.current,
      transitions,
      now,
    );
    noticeStateRef.current = state;

    // Onda 165: tudo que foi calado vira registro auditável. Mecanismo que
    // silencia sem prestar contas é ponto cego, não proteção.
    setSuppressionLedger((current) => recordSuppressions(current, suppressed, now));

    const nameOf = (cameraId: string) =>
      cameras.find((camera) => camera.id === cameraId)?.name ?? 'Câmera';

    for (const notice of notices) {
      const message = describeNotice(notice, nameOf);
      if (notice.status === 'alert' || notice.status === 'offline') toast.error(message);
      else toast.warning(message);
    }
  }, [statusLedger, cameras]);


  /**
   * Um único timer para todo o mapa: agenda-se o próximo vencimento em vez de
   * um intervalo por marcador (60 câmeras = 60 timers seria desperdício).
   */
  useEffect(() => {
    const due = nextExpiry(pulseLedger, Date.now());
    if (due === null) return;
    const delay = Math.max(50, Math.min(due - Date.now(), DEFAULT_PULSE_CONFIG.ttlMs));
    const timer = window.setTimeout(() => {
      setPulseLedger((current) => expirePulses(current, Date.now()));
    }, delay);
    return () => window.clearTimeout(timer);
  }, [pulseLedger]);

  const pulsingCameraIds = useMemo(() => pulsingIdsOf(pulseLedger, Date.now()), [pulseLedger]);

  /** Resumo do que a política calou — pronto para o painel de transparência. */
  const suppressionSummary = useMemo(
    () => summarizeSuppressions(suppressionLedger, Date.now()),
    [suppressionLedger],
  );

  const dismissSuppressions = useCallback((cameraId: string) => {
    setSuppressionLedger((current) => clearCameraSuppressions(current, cameraId));
  }, []);


  // Projeção: geometria (banco) + estado ao vivo (livro). Nunca o contrário.
  const placements = useMemo(
    () => reconcilePlacements(rawPlacements, statusLedger),
    [rawPlacements, statusLedger],
  );

  /** Envia a imagem da planta e cadastra o registro com as dimensões reais. */
  const createPlan = useCallback(
    async (file: File, name: string, dimensions: { width: number; height: number }) => {
      setSaving(true);
      setError(null);
      try {
        const { data: session } = await supabase.auth.getUser();
        const userId = session.user?.id;
        if (!userId) throw new Error('sessão ausente');

        const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
        // O primeiro nível da pasta é o dono: é assim que a política do
        // armazenamento isola as plantas de cada pessoa.
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false });
        if (uploadError) throw uploadError;

        const { data, error: insertError } = await supabase
          .from('site_plans')
          .insert({
            user_id: userId,
            name: name.trim(),
            image_path: path,
            image_width: Math.round(dimensions.width),
            image_height: Math.round(dimensions.height),
            is_default: plans.length === 0,
          })
          .select('id')
          .single();
        if (insertError) throw insertError;

        await loadPlans();
        setActivePlanId(data.id);
        return true;
      } catch (cause) {
        logger.error('Falha ao criar planta baixa', cause);
        setError('Não foi possível salvar a planta.');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadPlans, plans.length],
  );

  const addPlacement = useCallback(
    async (cameraId: string, position: NormalizedPoint) => {
      if (!activePlanId) return false;
      const safe = clampToPlan(position).point;
      const { error: insertError } = await supabase.from('site_plan_placements').insert({
        plan_id: activePlanId,
        camera_id: cameraId,
        x: safe.x,
        y: safe.y,
        heading_deg: 0,
        fov_deg: 90,
      });
      if (insertError) {
        logger.error('Falha ao posicionar câmera na planta', insertError);
        setError(
          insertError.code === '23505'
            ? 'Esta câmera já está posicionada nesta planta.'
            : 'Não foi possível posicionar a câmera.',
        );
        return false;
      }
      await loadPlacements(activePlanId);
      return true;
    },
    [activePlanId, loadPlacements],
  );

  /**
   * Move um marcador. Atualiza a tela primeiro e reverte se o banco recusar:
   * arrastar precisa ser fluido, mas nunca pode deixar a tela mentindo sobre
   * o que foi realmente salvo.
   */
  const movePlacement = useCallback(
    async (placementId: string, position: NormalizedPoint) => {
      const safe = clampToPlan(position).point;
      const previous = rawPlacements;
      setRawPlacements((current) =>
        current.map((item) => (item.id === placementId ? { ...item, position: safe } : item)),
      );
      const { error: updateError } = await supabase
        .from('site_plan_placements')
        .update({ x: safe.x, y: safe.y })
        .eq('id', placementId);
      if (updateError) {
        logger.error('Falha ao mover marcador', updateError);
        setRawPlacements(previous);
        setError('Não foi possível salvar a nova posição.');
        return false;
      }
      return true;
    },
    [rawPlacements],
  );

  const updateAim = useCallback(
    async (placementId: string, headingDeg: number, fovDeg: number) => {
      const heading = normalizeAngle(headingDeg);
      const fov = normalizeFov(fovDeg);
      setRawPlacements((current) =>
        current.map((item) =>
          item.id === placementId ? { ...item, headingDeg: heading, fovDeg: fov } : item,
        ),
      );
      const { error: updateError } = await supabase
        .from('site_plan_placements')
        .update({ heading_deg: heading, fov_deg: fov })
        .eq('id', placementId);
      if (updateError) {
        logger.error('Falha ao salvar mira do marcador', updateError);
        setError('Não foi possível salvar a direção da câmera.');
        if (activePlanId) await loadPlacements(activePlanId);
        return false;
      }
      return true;
    },
    [activePlanId, loadPlacements],
  );

  const removePlacement = useCallback(
    async (placementId: string) => {
      const { error: deleteError } = await supabase
        .from('site_plan_placements')
        .delete()
        .eq('id', placementId);
      if (deleteError) {
        logger.error('Falha ao remover marcador', deleteError);
        setError('Não foi possível remover o marcador.');
        return false;
      }
      setRawPlacements((current) => current.filter((item) => item.id !== placementId));
      return true;
    },
    [],
  );

  /**
   * Onda 166 — navegação entre andares. O rótulo de cada planta usa o livro de
   * estados ao vivo, então trocar de andar já mostra a situação atualizada.
   */
  const planNavigation = useMemo(
    () =>
      buildPlanNavigation({
        plans,
        roster: planRoster,
        statusOf: (cameraId) => statusLedger[cameraId]?.status,
        activePlanId,
      }),
    [plans, planRoster, statusLedger, activePlanId],
  );

  const unplacedCameras = useMemo(() => {
    const placed = new Set(placements.map((placement) => placement.cameraId));
    return cameras.filter((camera) => !placed.has(camera.id));
  }, [cameras, placements]);

  return {
    plans,
    planNavigation,
    activePlan,
    activePlanId,
    setActivePlanId,
    planImageUrl,
    placements,
    pulsingCameraIds,
    suppressionSummary,
    dismissSuppressions,

    cameras,
    unplacedCameras,
    loading,
    saving,
    error,
    clearError: () => setError(null),
    createPlan,
    addPlacement,
    movePlacement,
    updateAim,
    removePlacement,
    reload: loadPlans,
  };
}
