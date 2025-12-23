import { validateRequest, corsHeaders, errorResponse } from '../_shared/validation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing image for license plate...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um sistema de reconhecimento de placas de veículos (ALPR/ANPR).
Analise a imagem fornecida e extraia a placa do veículo.

IMPORTANTE:
- Retorne APENAS um objeto JSON válido
- Formate a placa no padrão Mercosul (ABC1D23) ou antigo (ABC-1234)
- Se não conseguir identificar a placa, retorne null para o campo plate
- Identifique o tipo de veículo se possível

Formato de resposta:
{
  "plate": "ABC1D23",
  "confidence": 0.95,
  "vehicleType": "car|motorcycle|truck|bus|unknown",
  "vehicleColor": "cor do veículo",
  "notes": "observações adicionais"
}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analise esta imagem e extraia a placa do veículo. Retorne apenas o JSON.'
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    console.log('AI response:', content);

    if (!content) {
      return new Response(
        JSON.stringify({ plate: null, error: 'No response from AI' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON response
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json
?|
?```/g, '').trim();
      const result = JSON.parse(jsonStr);
      
      console.log('Parsed result:', result);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      
      // Try to extract plate using regex
      const plateMatch = content.match(/[A-Z]{3}[0-9][A-Z0-9][0-9]{2}/i) || 
                         content.match(/[A-Z]{3}-?[0-9]{4}/i);
      
      if (plateMatch) {
        return new Response(
          JSON.stringify({ 
            plate: plateMatch[0].toUpperCase().replace('-', ''),
            confidence: 0.8,
            vehicleType: 'unknown'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ plate: null, error: 'Could not parse response' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error in analyze-license-plate:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
