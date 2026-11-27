import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ArmDisarmState {
  id: string;
  user_id: string;
  camera_id: string | null;
  state: 'armed' | 'disarmed' | 'scheduled';
  armed_by_email: string | null;
  armed_at: string | null;
  disarm_at: string | null;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_days: number[] | null;
  created_at: string;
  updated_at: string;
}

export function useArmDisarm(cameraId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: states = [], isLoading } = useQuery({
    queryKey: ['arm-disarm-states', cameraId],
    queryFn: async () => {
      let query = supabase.from('arm_disarm_states').select('*');
      if (cameraId) query = query.eq('camera_id', cameraId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ArmDisarmState[];
    },
    enabled: !!user,
  });

  const armCamera = useMutation({
    mutationFn: async ({
      cameraId,
      scheduledDisarm,
    }: {
      cameraId: string;
      scheduledDisarm?: string;
    }) => {
      // `onConflict: 'camera_id'`: existe indice unico por camera
      // (uq_arm_disarm_camera) e o executor de agendamentos cria o registro da
      // camera. Sem o alvo do conflito o upsert tentava inserir outro id e
      // batia no indice unico — o primeiro arme manual depois de um agendamento
      // falhava e a camera continuava desarmada.
      const { error } = await supabase.from('arm_disarm_states').upsert(
        {
          user_id: user!.id,
          camera_id: cameraId,
          state: 'armed',
          armed_by_email: user!.email ?? null,
          armed_at: new Date().toISOString(),
          disarm_at: scheduledDisarm || null,
        },
        { onConflict: 'camera_id' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arm-disarm-states'] });
      toast({ title: '🔒 Câmera Armada', description: 'Monitoramento ativado com sucesso.' });
    },
  });

  const disarmCamera = useMutation({
    mutationFn: async (cameraId: string) => {
      const { error } = await supabase
        .from('arm_disarm_states')
        .update({ state: 'disarmed', updated_at: new Date().toISOString() })
        .eq('camera_id', cameraId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arm-disarm-states'] });
      toast({ title: '🔓 Câmera Desarmada', description: 'Monitoramento desativado.' });
    },
  });

  const getCameraState = (camId: string): ArmDisarmState['state'] => {
    const found = states.find((s) => s.camera_id === camId);
    return found?.state || 'disarmed';
  };

  return { states, isLoading, armCamera, disarmCamera, getCameraState };
}
