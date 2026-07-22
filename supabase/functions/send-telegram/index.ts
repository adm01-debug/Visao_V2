import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { sendTelegramSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from "../_shared/timeout.ts";
import { isTestModeActive, buildTestModeResponse, recordTestModeSuppression } from "../_shared/testMode.ts";


const log = createLogger("send-telegram");

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.sensitive, "send-telegram", corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const rawBody = await req.json();
    const validation = validateInput(sendTelegramSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    
    const { botToken, chatId, message, parseMode, photo, testContext } = validation.data;
    const idempotencyKey = req.headers.get("x-idempotency-key");

    // Short-circuit dry-run: se o escopo estiver em modo teste, não chama a
    // API do Telegram e devolve resposta sintética marcada como suprimida.
    if (testContext?.userId && (await isTestModeActive(testContext))) {
      log.info("Test mode active — suppressing Telegram send", { chatId, scope: testContext });
      const payload = buildTestModeResponse(testContext, ["telegram"]);
      return new Response(
        JSON.stringify({ success: true, messageId: null, ...payload }),
        { headers: { ...corsHeaders, "Content-Type": "application/json", "x-test-mode": "1" } },
      );
    }

    const { data: responseData, fromCache } = await withIdempotency(idempotencyKey, async () => {
      log.info("Sending Telegram message", { chatId });

      let response;
      if (photo) {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', message);
        formData.append('parse_mode', parseMode);

        if (photo.startsWith('http')) {
          formData.append('photo', photo);
        } else if (photo.startsWith('data:image')) {
          const base64Data = photo.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          formData.append('photo', blob, 'snapshot.jpg');
        }

        response = await fetchWithTimeout(
          `https://api.telegram.org/bot${botToken}/sendPhoto`,
          { method: 'POST', body: formData },
          DEFAULT_TIMEOUTS.webhook,
        );
      } else {
        response = await fetchWithTimeout(
          `https://api.telegram.org/bot${botToken}/sendMessage`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: message,
              parse_mode: parseMode,
            }),
          },
          DEFAULT_TIMEOUTS.webhook,
        );
      }


      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.description || 'Failed to send message');
      }

      return { success: true, messageId: result.result.message_id };
    });

    if (fromCache) {
      log.info("Telegram response served from idempotency cache", { idempotencyKey });
    } else {
      log.info("Message sent successfully", { messageId: responseData.messageId });
    }

    return new Response(
      JSON.stringify(responseData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'x-idempotency-cache': fromCache ? 'HIT' : 'MISS'
        } 
      }
    );
  } catch (error) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
