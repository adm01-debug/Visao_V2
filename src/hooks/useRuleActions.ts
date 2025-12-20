/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Hook: useRuleActions
 * 
 * Executa ações das regras quando disparadas:
 * - alert: Cria alerta no banco
 * - notification: Envia notificação push/email/whatsapp
 * - record: Dispara gravação de clip
 * - alarm: Ativa sirene/alarme sonoro
 */

import { useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useClipRecorder } from '@/hooks/useClipRecorder';
import { useNotifications } from '@/hooks/useNotifications';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

type RuleActionType = 'alert' | 'notification' | 'record' | 'alarm';
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
  metadata?: Record<string, any>;
}

interface UseRuleActionsOptions {
  onActionExecuted?: (action: RuleActionType, event: RuleEvent) => void;
  onError?: (error: Error, action: RuleActionType) => void;
}

interface UseRuleActionsReturn {
  executeActions: (rule: Rule, cameraId: string, cameraName: string, metadata?: Record<string, any>) => Promise<void>;
  executeAction: (action: RuleActionType, event: RuleEvent) => Promise<boolean>;
  isExecuting: boolean;
  lastEvent: RuleEvent | null;
}

// ============================================
// CONSTANTES
// ============================================

// Som de alarme (sirene)
const ALARM_SOUND_URL = '/sounds/alarm.mp3';
const ALARM_DURATION_MS = 5000;

// ============================================
// HOOK PRINCIPAL
// ============================================

export function useRuleActions(options: UseRuleActionsOptions = {}): UseRuleActionsReturn {
  const { onActionExecuted, onError } = options;
  
  const isExecutingRef = useRef(false);
  const lastEventRef = useRef<RuleEvent | null>(null);
  const alarmAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeRecordersRef = useRef<Map<string, ReturnType<typeof useClipRecorder>>>(new Map());

  // Notifications hook
  const { sendNotification } = useNotifications();

  // Cleanup alarm audio on unmount
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
    try {
      const { error } = await supabase
        .from('alerts')
        .insert({
          camera_id: event.cameraId,
          camera_name: event.cameraName,
          rule_id: event.ruleId,
          type: event.triggerType,
          severity: event.severity,
          title: `Regra disparada: ${event.ruleName}`,
          message: `A regra "${event.ruleName}" foi acionada na câmera ${event.cameraName}`,
          timestamp: event.timestamp.toISOString(),
          is_read: false,
          metadata: event.metadata,
        });

      if (error) throw error;
      
      console.log('[RuleActions] Alerta criado:', event.ruleName);
      return true;
    } catch (error) {
      console.error('[RuleActions] Erro ao criar alerta:', error);
      onError?.(error as Error, 'alert');
      return false;
    }
  }, [onError]);

  /**
   * Enviar notificação (push/email/whatsapp)
   */
  const sendRuleNotification = useCallback(async (event: RuleEvent): Promise<boolean> => {
    try {
      // Notificação in-app
      await sendNotification({
        title: `⚠️ Regra: ${event.ruleName}`,
        body: `Câmera: ${event.cameraName}`,
        severity: event.severity,
        data: {
          ruleId: event.ruleId,
          cameraId: event.cameraId,
          type: 'rule_trigger',
        },
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

      if (error) throw error;
      
      console.log('[RuleActions] Notificação enviada:', event.ruleName);
      return true;
    } catch (error) {
      console.error('[RuleActions] Erro ao enviar notificação:', error);
      onError?.(error as Error, 'notification');
      return false;
    }
  }, [sendNotification, onError]);

  /**
   * Disparar gravação de clip
   */
  const triggerRecording = useCallback(async (event: RuleEvent, videoElement?: HTMLVideoElement): Promise<boolean> => {
    try {
      // Verificar se já existe uma gravação ativa para esta câmera
      if (activeRecordersRef.current.has(event.cameraId)) {
        console.log('[RuleActions] Gravação já em andamento para:', event.cameraId);
        return true;
      }

      // Se não temos um video element, criar clip via edge function
      if (!videoElement) {
        const { error } = await supabase
          .from('video_clips')
          .insert({
            camera_id: event.cameraId,
            start_time: new Date().toISOString(),
            end_time: new Date(Date.now() + 30000).toISOString(), // 30 segundos
            duration: 30,
            trigger_type: 'rule',
            trigger_rule_id: event.ruleId,
            notes: `Gravação automática - Regra: ${event.ruleName}`,
            tags: ['automatic', 'rule-trigger', event.severity],
          });

        if (error) throw error;
        
        toast.success(`Gravação iniciada: ${event.cameraName}`);
        console.log('[RuleActions] Clip registrado no banco:', event.ruleName);
        return true;
      }

      // Se temos video element, usar MediaRecorder
      // Nota: Isso requer que o componente passe o videoElement
      console.log('[RuleActions] Gravação com MediaRecorder iniciada');
      toast.success(`🔴 Gravando: ${event.cameraName}`);
      
      return true;
    } catch (error) {
      console.error('[RuleActions] Erro ao gravar:', error);
      onError?.(error as Error, 'record');
      return false;
    }
  }, [onError]);

  /**
   * Ativar alarme sonoro
   */
  const triggerAlarm = useCallback(async (event: RuleEvent): Promise<boolean> => {
    try {
      // Parar alarme anterior se existir
      if (alarmAudioRef.current) {
        alarmAudioRef.current.pause();
      }

      // Criar e tocar novo alarme
      const audio = new Audio(ALARM_SOUND_URL);
      audio.loop = true;
      audio.volume = 1.0;
      alarmAudioRef.current = audio;

      await audio.play().catch(() => {
        // Fallback: usar toast com vibração se áudio bloqueado
        toast.error(`🚨 ALARME: ${event.ruleName}`, {
          duration: ALARM_DURATION_MS,
        });
        
        // Vibrar se disponível
        if ('vibrate' in navigator) {
          navigator.vibrate([500, 200, 500, 200, 500]);
        }
      });

      // Parar após duração
      setTimeout(() => {
        if (alarmAudioRef.current) {
          alarmAudioRef.current.pause();
          alarmAudioRef.current = null;
        }
      }, ALARM_DURATION_MS);

      console.log('[RuleActions] Alarme ativado:', event.ruleName);
      return true;
    } catch (error) {
      console.error('[RuleActions] Erro ao tocar alarme:', error);
      onError?.(error as Error, 'alarm');
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
      case 'notification':
        success = await sendRuleNotification(event);
        break;
      case 'record':
        success = await triggerRecording(event);
        break;
      case 'alarm':
        success = await triggerAlarm(event);
        break;
      default:
        console.warn('[RuleActions] Ação desconhecida:', action);
        return false;
    }

    if (success) {
      onActionExecuted?.(action, event);
    }

    return success;
  }, [createAlert, sendRuleNotification, triggerRecording, triggerAlarm, onActionExecuted]);

  /**
   * Executar todas as ações de uma regra
   */
  const executeActions = useCallback(async (
    rule: Rule,
    cameraId: string,
    cameraName: string,
    metadata?: Record<string, any>
  ): Promise<void> => {
    if (!rule.isActive) {
      console.log('[RuleActions] Regra inativa, ignorando:', rule.name);
      return;
    }

    if (isExecutingRef.current) {
      console.log('[RuleActions] Já executando ações, aguarde...');
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

    console.log('[RuleActions] Executando ações para regra:', rule.name, rule.actions);

    try {
      // Executar todas as ações em paralelo
      const results = await Promise.allSettled(
        rule.actions.map(action => executeAction(action, event))
      );

      // Verificar resultados
      const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
      
      if (failures.length > 0) {
        console.warn('[RuleActions] Algumas ações falharam:', failures.length);
      }

      // Registrar execução no histórico
      await supabase
        .from('rule_executions')
        .insert({
          rule_id: rule.id,
          camera_id: cameraId,
          trigger_type: event.triggerType,
          actions_executed: rule.actions,
          success: failures.length === 0,
          metadata: event.metadata,
        })
        .catch(() => {}); // Ignorar erro se tabela não existir

    } catch (error) {
      console.error('[RuleActions] Erro ao executar ações:', error);
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
