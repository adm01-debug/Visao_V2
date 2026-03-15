import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
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
    mutationFn: async ({ cameraId, scheduledDisarm }: { cameraId: string; scheduledDisarm?: string }) => {
      const { error } = await supabase.from('arm_disarm_states').upsert({
        user_id: user!.id,
        camera_id: cameraId,
        state: 'armed',
        armed_by_email: user!.email,
        armed_at: new Date().toISOString(),
        disarm_at: scheduledDisarm || null,
      } as any, { onConflict: 'camera_id,user_id' } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['arm-disarm-states'] });
      toast({ title: '🔒 Câmera Armada', description: 'Monitoramento ativado com sucesso.' });
    },
  });

  const disarmCamera = useMutation({
    mutationFn: async (cameraId: string) => {
      const { error } = await supabase.from('arm_disarm_states' as any)
        .update({ state: 'disarmed', updated_at: new Date().toISOString() } as any)
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
    const found = states.find(s => s.camera_id === camId);
    return found?.state || 'disarmed';
  };

  return { states, isLoading, armCamera, disarmCamera, getCameraState };
}
