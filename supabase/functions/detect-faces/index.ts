import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from "../_shared/cors.ts";
import { detectFacesSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";
import { fetchWithTimeout, DEFAULT_TIMEOUTS } from "../_shared/timeout.ts";


const log = createLogger("detect-faces");

interface BoundingBox { x: number; y: number; width: number; height: number; }
interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
}
interface DetectedFace {
  boundingBox: BoundingBox;
  confidence: number;
  landmarks?: FaceLandmarks;
  age?: number;
  gender?: 'male' | 'female';
  emotion?: string;
}
interface DetectFacesResponse {
  success: boolean;
  faces: DetectedFace[];
  count: number;
  processingTime: number;
  error?: string;
}

const detectFaces = async (imageBase64: string, minConfidence: number, maxFaces: number): Promise<DetectFacesResponse> => {
  const startTime = Date.now();
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-1.5-flash",
        messages: [
          { 
            role: "system", 
            content: "You are an AI face detection specialist. Detect faces in the image and return their bounding boxes and confidence. Respond ONLY with JSON: { \"faces\": [{ \"boundingBox\": { \"x\": number, \"y\": number, \"width\": number, \"height\": number }, \"confidence\": number }] }" 
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Detect faces in this image:" },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    const faces = result.faces || [];

    return {
      success: true,
      faces: faces.slice(0, maxFaces).filter((f: any) => f.confidence >= minConfidence),
      count: faces.length,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false, faces: [], count: 0,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Detection failed',
    };
  }
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, RATE_LIMITS.ai, "detect-faces", corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const rawBody = await req.json();
    const validation = validateInput(detectFacesSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const { imageBase64, minConfidence, maxFaces } = validation.data;
    const traceId = req.headers.get("x-request-id") || undefined;

    log.info("Detecting faces", { minConfidence, maxFaces, traceId });
    const result = await detectFaces(imageBase64, minConfidence, maxFaces);
    log.info("Detection complete", { count: result.count });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    log.error("Unhandled error", { error: error instanceof Error ? error.message : "Unknown" });
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Internal error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
