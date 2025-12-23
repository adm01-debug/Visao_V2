/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Edge Function: send-alert-notification
 * 
 * Envia notificações de alertas via múltiplos canais:
 * - Email (via Resend)
 * - WhatsApp (via Evolution API / Z-API)
 * - Webhook
 * - Push Notification
 */

import { validateRequest, corsHeaders, errorResponse } from '../_shared/validation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AlertNotification {
  alertId: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cameraName: string;
  timestamp: string;
  snapshotUrl?: string;
  channels: ('email' | 'whatsapp' | 'webhook' | 'push')[];
  recipients?: {
    emails?: string[];
    phones?: string[];
    webhookUrls?: string[];
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notification: AlertNotification = await req.json();
    const results: Record<string, { success: boolean; error?: string }> = {};

    console.log(`[send-alert-notification] Processing alert: ${notification.alertId}`);
    console.log(`[send-alert-notification] Channels: ${notification.channels.join(', ')}`);

    // ==========================================
    // EMAIL via Resend
    // ==========================================
    if (notification.channels.includes('email')) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const emails = notification.recipients?.emails || [];

      if (RESEND_API_KEY && emails.length > 0) {
        try {
          const severityColors: Record<string, string> = {
            low: '#3B82F6',
            medium: '#F59E0B',
            high: '#F97316',
            critical: '#EF4444',
          };

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${severityColors[notification.severity]}; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">⚠️ ALERTA VISÃO</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Severidade: ${notification.severity.toUpperCase()}</p>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <p style="font-size: 18px; color: #111827; margin-bottom: 10px;">
                  <strong>Câmera:</strong> ${notification.cameraName}
                </p>
                <p style="font-size: 16px; color: #374151;">
                  <strong>Tipo:</strong> ${notification.type}
                </p>
                <p style="font-size: 16px; color: #374151;">
                  <strong>Mensagem:</strong> ${notification.message}
                </p>
                <p style="font-size: 14px; color: #6b7280;">
                  <strong>Data/Hora:</strong> ${new Date(notification.timestamp).toLocaleString('pt-BR')}
                </p>
                ${notification.snapshotUrl ? `
                  <div style="margin-top: 20px;">
                    <p style="font-size: 14px; color: #6b7280; margin-bottom: 10px;">Snapshot:</p>
                    <img src="${notification.snapshotUrl}" alt="Snapshot" style="max-width: 100%; border-radius: 8px;" />
                  </div>
                ` : ''}
              </div>
              <div style="padding: 15px; background: #e5e7eb; text-align: center; font-size: 12px; color: #6b7280;">
                VISÃO - Sistema de Vigilância Inteligente
              </div>
            </div>
          `;

          const emailResponse = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: 'VISÃO Alertas <alertas@visao.app>',
              to: emails,
              subject: `[${notification.severity.toUpperCase()}] Alerta VISÃO - ${notification.cameraName}`,
              html: emailHtml,
            }),
          });

          if (emailResponse.ok) {
            results.email = { success: true };
            console.log(`[send-alert-notification] Email sent to ${emails.length} recipients`);
          } else {
            const errorText = await emailResponse.text();
            results.email = { success: false, error: errorText };
          }
        } catch (err) {
          results.email = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.email = { success: false, error: 'No API key or recipients' };
      }
    }

    // ==========================================
    // WHATSAPP via Evolution API / Z-API
    // ==========================================
    if (notification.channels.includes('whatsapp')) {
      const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
      const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
      const WHATSAPP_INSTANCE = Deno.env.get("WHATSAPP_INSTANCE");
      const phones = notification.recipients?.phones || [];

      if (WHATSAPP_API_URL && WHATSAPP_API_KEY && phones.length > 0) {
        try {
          const severityEmoji: Record<string, string> = {
            low: 'ℹ️',
            medium: '⚠️',
            high: '🔶',
            critical: '🚨',
          };

          const whatsappMessage = `${severityEmoji[notification.severity]} *ALERTA VISÃO*

*Severidade:* ${notification.severity.toUpperCase()}
*Câmera:* ${notification.cameraName}
*Tipo:* ${notification.type}

*Mensagem:*
${notification.message}

*Data/Hora:* ${new Date(notification.timestamp).toLocaleString('pt-BR')}`;

          for (const phone of phones) {
            const cleanPhone = phone.replace(/\D/g, '');
            
            const whatsappResponse = await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
              method: 'POST',
              headers: {
                'apikey': WHATSAPP_API_KEY,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                number: cleanPhone,
                text: whatsappMessage,
              }),
            });

            if (!whatsappResponse.ok) {
              console.error(`[send-alert-notification] WhatsApp failed for ${phone}`);
            }
          }

          results.whatsapp = { success: true };
          console.log(`[send-alert-notification] WhatsApp sent to ${phones.length} recipients`);
        } catch (err) {
          results.whatsapp = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.whatsapp = { success: false, error: 'No API configuration or recipients' };
      }
    }

    // ==========================================
    // WEBHOOK
    // ==========================================
    if (notification.channels.includes('webhook')) {
      const webhookUrls = notification.recipients?.webhookUrls || [];

      if (webhookUrls.length > 0) {
        try {
          const webhookPayload = {
            event: 'alert.created',
            alertId: notification.alertId,
            type: notification.type,
            severity: notification.severity,
            message: notification.message,
            cameraName: notification.cameraName,
            timestamp: notification.timestamp,
            snapshotUrl: notification.snapshotUrl,
          };

          for (const url of webhookUrls) {
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(webhookPayload),
            });
          }

          results.webhook = { success: true };
          console.log(`[send-alert-notification] Webhook sent to ${webhookUrls.length} endpoints`);
        } catch (err) {
          results.webhook = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.webhook = { success: false, error: 'No webhook URLs configured' };
      }
    }

    // ==========================================
    // RESPOSTA
    // ==========================================
    const allSuccessful = Object.values(results).every(r => r.success);
    
    return new Response(JSON.stringify({
      success: allSuccessful,
      alertId: notification.alertId,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[send-alert-notification] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
