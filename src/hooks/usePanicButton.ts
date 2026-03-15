import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface PanicEvent {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  latitude: number | null;
  longitude: number | null;
  location_address: string | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
  created_at: string;
}

export function usePanicButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['panic-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('panic_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as unknown as PanicEvent[];
    },
    enabled: !!user,
  });

  const triggerPanic = useMutation({
    mutationFn: async () => {
      // Get geolocation
      let latitude: number | null = null;
      let longitude: number | null = null;
      let locationAddress: string | null = null;

      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch {
        // Geolocation not available, proceed without it
      }

      const { error } = await supabase.from('panic_events' as any).insert({
        user_id: user!.id,
        user_name: (user as any)?.user_metadata?.full_name || user!.email,
        user_email: user!.email,
        latitude,
        longitude,
        location_address: locationAddress,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panic-events'] });
      toast({
        title: '🚨 PÂNICO ACIONADO',
        description: 'Alerta de pânico enviado com sucesso. Equipe de segurança notificada.',
        variant: 'destructive',
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Falha ao enviar alerta de pânico.',
        variant: 'destructive',
      });
    },
  });

  const resolvePanic = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from('panic_events' as any)
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user!.email,
        } as any)
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panic-events'] });
      toast({ title: 'Pânico Resolvido', description: 'Evento de pânico marcado como resolvido.' });
    },
  });

  const unresolvedCount = events.filter(e => !e.resolved).length;

  return { events, isLoading, triggerPanic, resolvePanic, unresolvedCount };
}
