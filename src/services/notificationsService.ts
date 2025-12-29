/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Notifications Service - Gerenciamento de configurações de notificação
 * 
 * @module services/notificationsService
 */

import { supabase } from "@/integrations/supabase/client";

export interface NotificationConfig {
  id?: string;
  type: string;
  enabled: boolean;
  settings?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface NotificationSecrets {
  id?: string;
  provider: string;
  key: string;
  value: string;
}

export const notificationsService = {
  /**
   * Buscar todas as configurações de notificação
   */
  async getAll(): Promise<NotificationConfig[]> {
    const { data, error } = await supabase
      .from("notification_config")
      .select("*");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Atualizar configuração de notificação
   */
  async update(config: Partial<NotificationConfig>): Promise<NotificationConfig> {
    const { data, error } = await supabase
      .from("notification_config")
      .upsert(config)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  /**
   * Enviar notificação de teste
   */
  async sendTest(type: string): Promise<void> {
    const { error } = await supabase.functions.invoke("send-alert-notification", {
      body: { test: true, type },
    });
    
    if (error) throw error;
  },

  /**
   * Buscar secrets de notificação (API keys, tokens)
   */
  async getSecrets(): Promise<NotificationSecrets[]> {
    const { data, error } = await supabase
      .from("notification_secrets")
      .select("*");
    
    if (error) throw error;
    return data || [];
  },

  /**
   * Atualizar secrets de notificação
   */
  async updateSecrets(secrets: Partial<NotificationSecrets>): Promise<NotificationSecrets> {
    const { data, error } = await supabase
      .from("notification_secrets")
      .upsert(secrets)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

export default notificationsService;
