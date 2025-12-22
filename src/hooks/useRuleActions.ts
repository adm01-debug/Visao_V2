import { logger } from "@/lib";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useRuleActions
 * 
 * Executa ações das regras quando disparadas
 */
import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
// ============================================
// TIPOS
// ============================================
type RuleActionType = 'alert' | 'notify' | 'record' | 'lockdown' | 'dispatch';
type RuleSeverity = 'low' | 'medium' | 'high' | 'critical';
interface RuleCondition {
  type: string;
  operator: string;
  value: number;
  value2?: number;
  duration?: number;
}
interface Rule {
  id: string;
  name: string;
  description?: string;
  category: string;
  severity: RuleSeverity;
  conditions: RuleCondition[];
  actions: RuleActionType[];
  cameras: string[];
  isActive: boolean;
}
interface RuleEvent {
  ruleId: string;
  ruleName: string;
  cameraId: string;
  cameraName: string;
  triggerType: string;
  severity: RuleSeverity;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
interface UseRuleActionsOptions {
  onActionExecuted?: (action: RuleActionType, event: RuleEvent) => void;
  onError?: (error: Error, action: RuleActionType) => void;
}
interface UseRuleActionsReturn {
  executeActions: (rule: Rule, cameraId: string, cameraName: string, metadata?: Record<string, unknown>) => Promise<void>;
  executeAction: (action: RuleActionType, event: RuleEvent) => Promise<boolean>;
  isExecuting: boolean;
  lastEvent: RuleEvent | null;
}
// ============================================
// CONSTANTES
// ============================================
const ALARM_SOUND_URL = '/sounds/alarm.mp3';
const ALARM_DURATION_MS = 5000;
// ============================================
// HOOK PRINCIPAL
// ============================================
export function useRuleActions(options: UseRuleActionsOptions = {}): UseRuleActionsReturn {
  const { onActionExecuted, onError } = options;
  const { user } = useAuth();
  const isExecutingRef = useRef(false);
  const lastEventRef = useRef<RuleEvent | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    return () => {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
        alarmAudioRef.current = null;
      }
    };
  }, []);
  /**
   * Criar alerta no banco de dados
   */
  const createAlert = useCallback(async (event: RuleEvent): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          user_id: user.id,
          camera_id: event.cameraId,
          camera_name: event.cameraName,
          type: 'security',
          severity: event.severity,
          message: `Regra "${event.ruleName}" disparada na câmera ${event.cameraName}`,
          timestamp: event.timestamp.toISOString(),
          is_read: false,
        });
      if (error) throw error;
      return true;
    } catch (error) {
      onError?.(error as Error, 'alert');
      return false;
    }
  }, [user, onError]);
  /**
   * Enviar notificação
   */
  const sendNotification = useCallback(async (event: RuleEvent): Promise<boolean> => {
    try {
      // Notificação via toast
      toast.warning(`⚠️ Regra: ${event.ruleName}`, {
        description: `Câmera: ${event.cameraName}`,
      });
      // Chamar edge function para email/whatsapp
      const { error } = await supabase.functions.invoke('send-alert-notification', {
        body: {
          type: 'rule_trigger',
          rule_name: event.ruleName,
          camera_name: event.cameraName,
          severity: event.severity,
          timestamp: event.timestamp.toISOString(),
          metadata: event.metadata,
        },
      });
      if (error) {
      }
      return true;
    } catch (error) {
      onError?.(error as Error, 'notify');
      return false;
    }
  }, [onError]);
  /**
   * Disparar gravação de clip
   */
  const triggerRecording = useCallback(async (event: RuleEvent): Promise<boolean> => {
    if (!user) return false;
    try {
      const { error } = await supabase
        .from('video_clips')
        .insert({
          user_id: user.id,
          camera_id: event.cameraId,
          start_time: new Date().toISOString(),
          status: 'recording',
        });
      if (error) throw error;
      toast.success(`Gravação iniciada: ${event.cameraName}`);
      return true;
    } catch (error) {
      onError?.(error as Error, 'record');
      return false;
    }
  }, [user, onError]);
  /**
   * Ativar alarme sonoro
   */
  const triggerAlarm = useCallback(async (event: RuleEvent): Promise<boolean> => {
    try {
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }
      const audio = new Audio(ALARM_SOUND_URL);
      audio.loop = true;
      audio.volume = 1.0;
      alarmAudioRef.current = audio;
      await audio.play().catch(() => {
        toast.error(`🚨 ALARME: ${event.ruleName}`, {
          duration: ALARM_DURATION_MS,
        });
        if ('vibrate' in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      });
      setTimeout(() => {
        if (alarmAudioRef.current) {
          alarmAudioRef.current.pause();
          alarmAudioRef.current = null;
        }
      }, ALARM_DURATION_MS);
      return true;
    } catch (error) {
      onError?.(error as Error, 'lockdown');
      return false;
    }
  }, [onError]);
  /**
   * Executar uma ação específica
   */
  const executeAction = useCallback(async (
    action: RuleActionType, 
    event: RuleEvent
  ): Promise<boolean> => {
    let success = false;
    switch (action) {
      case 'alert':
        success = await createAlert(event);
        break;
      case 'notify':
        success = await sendNotification(event);
        break;
      case 'record':
        success = await triggerRecording(event);
        break;
      case 'lockdown':
      case 'dispatch':
        success = await triggerAlarm(event);
        break;
      default:
        return false;
    }
    if (success) {
      onActionExecuted?.(action, event);
    }
    return success;
  }, [createAlert, sendNotification, triggerRecording, triggerAlarm, onActionExecuted]);
  /**
   * Executar todas as ações de uma regra
   */
  const executeActions = useCallback(async (
    rule: Rule,
    cameraId: string,
    cameraName: string,
    metadata?: Record<string, unknown>
  ): Promise<void> => {
    if (!rule.isActive) {
      return;
    }
    if (isExecutingRef.current) {
      return;
    }
    isExecutingRef.current = true;
    const event: RuleEvent = {
      ruleId: rule.id,
      ruleName: rule.name,
      cameraId,
      cameraName,
      triggerType: rule.conditions[0]?.type || 'unknown',
      severity: rule.severity,
      timestamp: new Date(),
      metadata,
    };
    lastEventRef.current = event;
    try {
      const results = await Promise.allSettled(
        rule.actions.map(action => executeAction(action, event))
      );
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
      if (failures.length > 0) {
      }
    } catch (error) {
    } finally {
      isExecutingRef.current = false;
    }
  }, [executeAction]);
  return {
    executeActions,
    executeAction,
    isExecuting: isExecutingRef.current,
    lastEvent: lastEventRef.current,
  };
}
export default useRuleActions;
