import { validateRequest, corsHeaders, errorResponse } from '../_shared/validation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TelegramMessage {
  botToken: string;
  chatId: string;
  message: string;
  parseMode?: 'HTML' | 'Markdown';
  photo?: string; // URL or base64
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { botToken, chatId, message, parseMode = 'HTML', photo }: TelegramMessage = await req.json();

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({ error: 'botToken and chatId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending Telegram message to chat ${chatId}`);

    let response;

    if (photo) {
      // Send photo with caption
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('caption', message);
      formData.append('parse_mode', parseMode);

      if (photo.startsWith('http')) {
        formData.append('photo', photo);
      } else if (photo.startsWith('data:image')) {
        // Convert base64 to blob
        const base64Data = photo.split(',')[1];
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });
        formData.append('photo', blob, 'snapshot.jpg');
      }

      response = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: formData,
      });
    } else {
      // Send text message
      response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: parseMode,
        }),
      });
    }

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram API error:', result);
      return new Response(
        JSON.stringify({ error: result.description || 'Failed to send message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message sent successfully');

    return new Response(
      JSON.stringify({ success: true, messageId: result.result.message_id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in send-telegram:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
