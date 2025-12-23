/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Edge Function: compare-faces
 * 
 * Compara uma face detectada com os encodings salvos no banco de dados.
 * Usa IA para gerar encoding da face e calcula similaridade com pessoas cadastradas.
 */

import { validateRequest, corsHeaders, errorResponse } from '../_shared/validation.ts';
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

import { validateRequest } from "../_shared/validation.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FaceEncoding {
  version: string;
  timestamp: string;
  faces: any[];
  primaryFace: {
    boundingBox: { x: number; y: number; width: number; height: number };
    confidence: number;
    quality: number;
    landmarks: any;
    attributes: any;
    pose: any;
  } | null;
  imageQuality: string;
}

interface MatchResult {
  personId: string;
  personName: string;
  photoUrl: string | null;
  listType: string | null;
  similarity: number;
  isMatch: boolean;
  attributes: any;
}

/**
 * Calcula a similaridade entre duas faces baseado em seus atributos
 * Usa uma combinação de landmarks e atributos faciais
 */
function calculateFaceSimilarity(
  face1: any,
  face2: any
): number {
  if (!face1 || !face2) return 0;

  let totalScore = 0;
  let weights = 0;

  // Comparar landmarks se disponíveis
  if (face1.landmarks && face2.landmarks) {
    const landmarkScore = compareLandmarks(face1.landmarks, face2.landmarks);
    totalScore += landmarkScore * 0.4;
    weights += 0.4;
  }

  // Comparar pose (rostos com pose similar têm mais chance de match)
  if (face1.pose && face2.pose) {
    const poseScore = comparePose(face1.pose, face2.pose);
    totalScore += poseScore * 0.2;
    weights += 0.2;
  }

  // Comparar atributos faciais
  if (face1.attributes && face2.attributes) {
    const attrScore = compareAttributes(face1.attributes, face2.attributes);
    totalScore += attrScore * 0.4;
    weights += 0.4;
  }

  // Bonus pela qualidade do match
  const qualityBonus = Math.min(face1.quality || 0.5, face2.quality || 0.5);
  
  return weights > 0 ? (totalScore / weights) * (0.7 + qualityBonus * 0.3) : 0;
}

function compareLandmarks(l1: any, l2: any): number {
  if (!l1 || !l2) return 0.5;
  
  const points = ['leftEye', 'rightEye', 'nose', 'leftMouth', 'rightMouth'];
  let totalDist = 0;
  let count = 0;

  for (const point of points) {
    if (l1[point] && l2[point]) {
      const dx = (l1[point].x - l2[point].x);
      const dy = (l1[point].y - l2[point].y);
      totalDist += Math.sqrt(dx * dx + dy * dy);
      count++;
    }
  }

  if (count === 0) return 0.5;
  
  // Normalizar distância (menor = melhor)
  const avgDist = totalDist / count;
  return Math.max(0, 1 - (avgDist / 50)); // 50 é o threshold máximo de distância
}

function comparePose(p1: any, p2: any): number {
  if (!p1 || !p2) return 0.5;
  
  const yawDiff = Math.abs((p1.yaw || 0) - (p2.yaw || 0));
  const pitchDiff = Math.abs((p1.pitch || 0) - (p2.pitch || 0));
  const rollDiff = Math.abs((p1.roll || 0) - (p2.roll || 0));
  
  // Penalizar diferenças grandes de pose
  const avgDiff = (yawDiff + pitchDiff + rollDiff) / 3;
  return Math.max(0, 1 - (avgDiff / 45)); // 45 graus = 0 de similaridade
}

function compareAttributes(a1: any, a2: any): number {
  if (!a1 || !a2) return 0.5;
  
  let score = 0;
  let count = 0;

  // Gênero
  if (a1.gender && a2.gender) {
    score += a1.gender === a2.gender ? 1 : 0;
    count++;
  }

  // Idade (tolerância de ±10 anos)
  if (a1.age !== undefined && a2.age !== undefined) {
    const ageDiff = Math.abs(a1.age - a2.age);
    score += Math.max(0, 1 - (ageDiff / 20));
    count++;
  }

  // Atributos booleanos
  const boolAttrs = ['glasses', 'beard', 'mask'];
  for (const attr of boolAttrs) {
    if (a1[attr] !== undefined && a2[attr] !== undefined) {
      score += a1[attr] === a2[attr] ? 1 : 0.3;
      count++;
    }
  }

  return count > 0 ? score / count : 0.5;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, imageUrl, cameraId, threshold = 0.6 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!imageBase64 && !imageUrl) {
      throw new Error("Either imageBase64 or imageUrl is required");
    }

    console.log(`[compare-faces] Processing image for camera: ${cameraId || 'unknown'}`);

    // 1. Detectar faces na imagem usando IA
    const imageContent = imageBase64 
      ? { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
      : { type: "image_url", image_url: { url: imageUrl } };

    const systemPrompt = `You are an AI face detection and analysis system. Analyze the image and detect all human faces.

For EACH face detected, provide detailed analysis for face comparison:
1. Bounding box (as percentage of image dimensions, 0-100)
2. Confidence score (0-1)
3. Quality score (0-1, based on lighting, blur, occlusion)
4. Facial landmarks for key points
5. Facial attributes for comparison
6. Head pose estimation

Respond ONLY with valid JSON:
{
  "faces": [
    {
      "boundingBox": { "x": number, "y": number, "width": number, "height": number },
      "confidence": number,
      "quality": number,
      "landmarks": {
        "leftEye": { "x": number, "y": number },
        "rightEye": { "x": number, "y": number },
        "nose": { "x": number, "y": number },
        "leftMouth": { "x": number, "y": number },
        "rightMouth": { "x": number, "y": number }
      },
      "attributes": {
        "age": number,
        "gender": "male" | "female" | "unknown",
        "emotion": string,
        "glasses": boolean,
        "mask": boolean,
        "beard": boolean
      },
      "pose": {
        "yaw": number,
        "pitch": number,
        "roll": number
      }
    }
  ],
  "faceCount": number
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              { type: "text", text: "Detect and analyze all faces in this image:" },
              imageContent
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ 
          success: false,
          error: "Rate limit exceeded",
          matches: []
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    let detectionResult;
    try {
      detectionResult = JSON.parse(content);
    } catch {
      console.log("[compare-faces] Failed to parse AI response:", content);
      detectionResult = { faces: [], faceCount: 0 };
    }

    const detectedFaces = detectionResult.faces || [];
    console.log(`[compare-faces] Detected ${detectedFaces.length} faces`);

    if (detectedFaces.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        faceCount: 0,
        matches: [],
        message: "No faces detected"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Buscar pessoas cadastradas com encoding facial
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: persons, error: dbError } = await supabase
      .from('registered_persons')
      .select('id, name, photo_url, list_type, face_encoding, is_active')
      .eq('is_active', true)
      .not('face_encoding', 'is', null);

    if (dbError) {
      console.error("[compare-faces] Database error:", dbError);
      throw dbError;
    }

    console.log(`[compare-faces] Found ${persons?.length || 0} registered persons with encodings`);

    // 3. Comparar cada face detectada com as pessoas cadastradas
    const results: any[] = [];

    for (const detectedFace of detectedFaces) {
      const faceMatches: MatchResult[] = [];

      for (const person of (persons || [])) {
        const encoding = person.face_encoding as FaceEncoding;
        if (!encoding?.primaryFace) continue;

        // Calcular similaridade
        const similarity = calculateFaceSimilarity(detectedFace, encoding.primaryFace);
        const isMatch = similarity >= threshold;

        faceMatches.push({
          personId: person.id,
          personName: person.name,
          photoUrl: person.photo_url,
          listType: person.list_type,
          similarity,
          isMatch,
          attributes: encoding.primaryFace.attributes,
        });
      }

      // Ordenar por similaridade
      faceMatches.sort((a, b) => b.similarity - a.similarity);

      // Melhor match
      const bestMatch = faceMatches.find(m => m.isMatch);

      results.push({
        detectedFace: {
          boundingBox: detectedFace.boundingBox,
          confidence: detectedFace.confidence,
          quality: detectedFace.quality,
          attributes: detectedFace.attributes,
        },
        isKnown: !!bestMatch,
        bestMatch: bestMatch || null,
        allMatches: faceMatches.slice(0, 5), // Top 5 matches
      });
    }

    console.log(`[compare-faces] Completed comparison. Known: ${results.filter(r => r.isKnown).length}/${results.length}`);

    return new Response(JSON.stringify({
      success: true,
      faceCount: detectedFaces.length,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[compare-faces] Error:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      matches: []
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
