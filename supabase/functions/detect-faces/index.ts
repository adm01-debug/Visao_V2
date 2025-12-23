/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Edge Function: detect-faces
 * 
 * Detecta faces em imagens usando IA (Google Gemini).
 * Retorna bounding boxes, landmarks e atributos faciais.
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
    const { imageBase64, imageUrl, options } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64 && !imageUrl) {
      throw new Error("Either imageBase64 or imageUrl is required");
    }

    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const systemPrompt = `You are an AI face detection system. Analyze the image and detect all human faces.

For EACH face detected, provide:
1. Bounding box (as percentage of image dimensions, 0-100)
2. Confidence score (0-1)
3. Estimated quality (0-1, based on lighting, blur, occlusion)
4. Facial attributes if detectable
5. Head pose estimation

IMPORTANT: Respond ONLY with valid JSON, no markdown, no explanation.

Response format:
{
  "faces": [
    {
      "boundingBox": {
        "x": number (0-100, left edge percentage),
        "y": number (0-100, top edge percentage),
        "width": number (0-100, width percentage),
        "height": number (0-100, height percentage)
      },
      "confidence": number (0-1),
      "quality": number (0-1),
      "landmarks": {
        "leftEye": { "x": number, "y": number },
        "rightEye": { "x": number, "y": number },
        "nose": { "x": number, "y": number },
        "leftMouth": { "x": number, "y": number },
        "rightMouth": { "x": number, "y": number }
      },
      "attributes": {
        "age": number (estimated age),
        "gender": "male" | "female" | "unknown",
        "emotion": "neutral" | "happy" | "sad" | "angry" | "surprised" | "fear",
        "glasses": boolean,
        "mask": boolean,
        "beard": boolean
      },
      "pose": {
        "yaw": number (-90 to 90, horizontal rotation),
        "pitch": number (-90 to 90, vertical rotation),
        "roll": number (-90 to 90, tilt)
      }
    }
  ],
  "faceCount": number,
  "imageQuality": "good" | "medium" | "poor",
  "processingNotes": string (any relevant observations)
}

If no faces are detected, return:
{
  "faces": [],
  "faceCount": 0,
  "imageQuality": "good" | "medium" | "poor",
  "processingNotes": "No faces detected"
}`;

    console.log(`[detect-faces] Processing image...`);

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
              { type: "text", text: "Detect all faces in this image and provide detailed analysis:" },
              imageContent
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[detect-faces] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Rate limit exceeded. Please try again later.",
          faces: []
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch {
      console.log("[detect-faces] Raw AI response:", content);
      result = { faces: [], faceCount: 0, processingNotes: "Failed to parse response" };
    }

    // Validar e normalizar resultado
    const faces = (result.faces || []).map((face: any, index: number) => ({
      boundingBox: {
        x: Math.max(0, Math.min(100, face.boundingBox?.x || 0)),
        y: Math.max(0, Math.min(100, face.boundingBox?.y || 0)),
        width: Math.max(1, Math.min(100, face.boundingBox?.width || 10)),
        height: Math.max(1, Math.min(100, face.boundingBox?.height || 10)),
      },
      confidence: Math.max(0, Math.min(1, face.confidence || 0.9)),
      quality: Math.max(0, Math.min(1, face.quality || 0.7)),
      landmarks: face.landmarks || null,
      attributes: face.attributes || null,
      pose: face.pose || null,
    }));

    console.log(`[detect-faces] Detected ${faces.length} faces`);

    return new Response(JSON.stringify({ 
      success: true, 
      faces,
      faceCount: faces.length,
      imageQuality: result.imageQuality || 'medium',
      processingNotes: result.processingNotes,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[detect-faces] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      faces: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
