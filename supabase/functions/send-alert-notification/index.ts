import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendAlertNotificationSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("send-alert-notification");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, "send-alert", corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const rawBody = await req.json();
    const validation = validateInput(sendAlertNotificationSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const notification = validation.data;

    const results: Record<string, { success: boolean; error?: string }> = {};

    log.info("Processing alert notification", {
      alertId: notification.alertId,
      channels: notification.channels,
      severity: notification.severity,
    });

    // EMAIL via Resend
    if (notification.channels.includes('email')) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      const emails = notification.recipients?.emails || [];

      if (RESEND_API_KEY && emails.length > 0) {
        try {
          const severityColors: Record<string, string> = {
            low: '#3B82F6', medium: '#F59E0B', high: '#F97316', critical: '#EF4444',
          };

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: ${severityColors[notification.severity]}; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0;">⚠️ ALERTA VISÃO</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">Severidade: ${notification.severity.toUpperCase()}</p>
              </div>
              <div style="padding: 20px; background: #f9fafb;">
                <p><strong>Câmera:</strong> ${notification.cameraName}</p>
                <p><strong>Tipo:</strong> ${notification.type}</p>
                <p><strong>Mensagem:</strong> ${notification.message}</p>
                <p><strong>Data/Hora:</strong> ${new Date(notification.timestamp).toLocaleString('pt-BR')}</p>
                ${notification.snapshotUrl ? `<img src="${notification.snapshotUrl}" alt="Snapshot" style="max-width: 100%; border-radius: 8px;" />` : ''}
              </div>
            </div>`;

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

          results.email = emailResponse.ok
            ? { success: true }
            : { success: false, error: await emailResponse.text() };
        } catch (err) {
          results.email = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.email = { success: false, error: 'No API key or recipients' };
      }
    }

    // TELEGRAM
    if (notification.channels.includes('telegram')) {
      const telegramConfig = notification.telegram;

      if (telegramConfig?.botToken && telegramConfig?.chatId) {
        try {
          const severityEmoji: Record<string, string> = {
            low: 'ℹ️', medium: '⚠️', high: '🔶', critical: '🚨',
          };

          const telegramMessage = `${severityEmoji[notification.severity]} <b>ALERTA VISÃO</b>\n\n<b>Severidade:</b> ${notification.severity.toUpperCase()}\n<b>Câmera:</b> ${notification.cameraName}\n<b>Tipo:</b> ${notification.type}\n\n<b>Mensagem:</b>\n${notification.message}\n\n<b>Data/Hora:</b> ${new Date(notification.timestamp).toLocaleString('pt-BR')}`;

          let telegramResponse;

          if (notification.snapshotUrl && notification.snapshotUrl.startsWith('http')) {
            const formData = new FormData();
            formData.append('chat_id', telegramConfig.chatId);
            formData.append('caption', telegramMessage);
            formData.append('parse_mode', 'HTML');
            formData.append('photo', notification.snapshotUrl);
            telegramResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendPhoto`, { method: 'POST', body: formData });
          } else {
            telegramResponse = await fetch(`https://api.telegram.org/bot${telegramConfig.botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: telegramConfig.chatId, text: telegramMessage, parse_mode: 'HTML' }),
            });
          }

          const telegramResult = await telegramResponse.json();
          results.telegram = telegramResult.ok
            ? { success: true }
            : { success: false, error: telegramResult.description || 'Telegram API error' };
        } catch (err) {
          results.telegram = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.telegram = { success: false, error: 'No Telegram bot token or chat ID configured' };
      }
    }

    // WHATSAPP
    if (notification.channels.includes('whatsapp')) {
      const WHATSAPP_API_URL = Deno.env.get("WHATSAPP_API_URL");
      const WHATSAPP_API_KEY = Deno.env.get("WHATSAPP_API_KEY");
      const WHATSAPP_INSTANCE = Deno.env.get("WHATSAPP_INSTANCE");
      const phones = notification.recipients?.phones || [];

      if (WHATSAPP_API_URL && WHATSAPP_API_KEY && phones.length > 0) {
        try {
          const whatsappMessage = `⚠️ *ALERTA VISÃO*\n*Severidade:* ${notification.severity.toUpperCase()}\n*Câmera:* ${notification.cameraName}\n*Mensagem:* ${notification.message}`;

          for (const phone of phones) {
            const cleanPhone = phone.replace(/\D/g, '');
            await fetch(`${WHATSAPP_API_URL}/message/sendText/${WHATSAPP_INSTANCE}`, {
              method: 'POST',
              headers: { 'apikey': WHATSAPP_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ number: cleanPhone, text: whatsappMessage }),
            });
          }
          results.whatsapp = { success: true };
        } catch (err) {
          results.whatsapp = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.whatsapp = { success: false, error: 'No API configuration or recipients' };
      }
    }

    // WEBHOOK
    if (notification.channels.includes('webhook')) {
      const webhookUrls = notification.recipients?.webhookUrls || [];
      if (webhookUrls.length > 0) {
        try {
          for (const url of webhookUrls) {
            await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event: 'alert.created',
                alertId: notification.alertId,
                type: notification.type,
                severity: notification.severity,
                message: notification.message,
                cameraName: notification.cameraName,
                timestamp: notification.timestamp,
              }),
            });
          }
          results.webhook = { success: true };
        } catch (err) {
          results.webhook = { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      } else {
        results.webhook = { success: false, error: 'No webhook URLs configured' };
      }
    }

    const allSuccessful = Object.values(results).every(r => r.success);
    log.info("Notification dispatch complete", { alertId: notification.alertId, results });

    return new Response(JSON.stringify({
      success: allSuccessful,
      alertId: notification.alertId,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
