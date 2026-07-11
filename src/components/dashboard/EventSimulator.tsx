import { memo, useState } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AlertType = Database['public']['Enums']['alert_type'];
type Severity = Database['public']['Enums']['alert_severity'] extends never
  ? 'low' | 'medium' | 'high' | 'critical'
  : Database['public']['Enums']['alert_severity'];

interface SimCamera { id: string; name: string; }
interface EventSimulatorProps { cameras: SimCamera[]; }

interface EventTemplate {
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  messages: string[];
  category: 'risk' | 'productivity';
}

const TEMPLATES: EventTemplate[] = [
  { type: 'security', severity: 'high', category: 'risk',
    messages: ['Movimento detectado fora do horário permitido', 'Presença suspeita na área restrita'] },
  { type: 'access', severity: 'critical', category: 'risk',
    messages: ['Tentativa de acesso não autorizado', 'Invasão detectada no perímetro'] },
  { type: 'anomaly', severity: 'medium', category: 'risk',
    messages: ['Comportamento anômalo identificado durante a noite', 'Padrão de movimentação incomum'] },
  { type: 'operations', severity: 'low', category: 'productivity',
    messages: ['Colaborador ausente do posto por mais de 15min', 'Baixa atividade detectada na estação'] },
  { type: 'operations', severity: 'medium', category: 'productivity',
    messages: ['Aglomeração fora da área operacional', 'Fluxo abaixo do esperado'] },
  { type: 'safety', severity: 'high', category: 'risk',
    messages: ['EPI ausente em área obrigatória', 'Situação de risco à segurança identificada'] },
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function EventSimulatorComponent({ cameras }: EventSimulatorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    if (!user) return;
    if (cameras.length === 0) {
      toast.error('Cadastre ao menos uma câmera para simular eventos');
      return;
    }
    setLoading(true);
    try {
      const count = 3 + Math.floor(Math.random() * 3);
      const rows = Array.from({ length: count }, () => {
        const cam = pick(cameras);
        const tpl = pick(TEMPLATES);
        return {
          user_id: user.id,
          camera_id: cam.id,
          camera_name: cam.name,
          type: tpl.type,
          severity: tpl.severity as Severity,
          message: pick(tpl.messages),
          timestamp: new Date().toISOString(),
          is_read: false,
        };
      });
      const { error } = await supabase.from('alerts').insert(rows);
      if (error) throw error;
      toast.success(`${count} eventos simulados gerados`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao simular eventos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline" size="icon" className="h-8 w-8 rounded-lg"
          onClick={handleSimulate} disabled={loading}
          aria-label="Simular eventos"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Simular eventos de risco/produtividade</TooltipContent>
    </Tooltip>
  );
}

export const EventSimulator = memo(EventSimulatorComponent);
