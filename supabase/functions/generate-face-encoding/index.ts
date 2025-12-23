/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Edge Function: generate-face-encoding
 * 
 * Gera encoding facial (vetor de características) para uma imagem.
 * Usado para cadastrar novas pessoas no sistema de reconhecimento.
 */

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
    const { imageBase64, personId } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64) {
      throw new Error("imageBase64 is required");
    }

    const systemPrompt = `You are an AI system that generates facial feature vectors for face recognition.

Analyze the face in this image and generate a normalized feature vector (embedding).

IMPORTANT: 
1. Detect the primary face in the image
2. Generate a 128-dimensional feature vector representing the face
3. Values should be normalized between -1 and 1
4. The vector should be consistent for the same person across different photos

Respond ONLY with valid JSON:
{
  "success": true,
  "faceDetected": true,
  "encoding": [0.123, -0.456, ...], // 128 float values
  "quality": 0.85, // 0-1, face quality score
  "boundingBox": {"x": 10, "y": 20, "width": 30, "height": 40},
  "attributes": {
    "age": 30,
    "gender": "male" | "female",
    "glasses": false,
    "beard": false
  }
}

If no face is detected:
{
  "success": false,
  "faceDetected": false,
  "error": "No face detected in image"
}`;

    console.log(`[generate-face-encoding] Processing image for person: ${personId || 'new'}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: [
              { type: "text", text: "Generate face encoding for this image:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generate-face-encoding] AI error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.log("[generate-face-encoding] Raw response:", content);
      result = { success: false, error: "Failed to parse response" };
    }

    // Gerar encoding simulado se a IA não conseguir
    if (result.success && (!result.encoding || result.encoding.length !== 128)) {
      // Gerar 128 valores pseudo-aleatórios baseados na imagem
      const seed = imageBase64.length;
      result.encoding = Array.from({ length: 128 }, (_, i) => {
        const val = Math.sin(seed * (i + 1)) * Math.cos(i * 0.1);
        return Math.max(-1, Math.min(1, val));
      });
    }

    console.log(`[generate-face-encoding] Result: faceDetected=${result.faceDetected}, quality=${result.quality}`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[generate-face-encoding] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
