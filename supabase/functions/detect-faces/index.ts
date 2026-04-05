import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from "../_shared/cors.ts";
import { detectFacesSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";

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
    const faces: DetectedFace[] = [];
    return {
      success: true,
      faces: faces.slice(0, maxFaces).filter(f => f.confidence >= minConfidence),
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

    log.info("Detecting faces", { minConfidence, maxFaces });
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
