import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from "../_shared/cors.ts";
import { compareFacesSchema, validateInput } from "../_shared/validation.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rateLimiter.ts";
import { createLogger } from "../_shared/logger.ts";

const log = createLogger("compare-faces");

const SYSTEM_PROMPT = `You are an AI face recognition specialist. 
Compare the two provided faces and determine if they belong to the same person.
Respond ONLY with valid JSON:
{
  "matched": boolean,
  "similarity": number (0-1),
  "confidence": number (0-100),
  "details": string
}`;

interface CompareResult {
  matched: boolean;
  similarity: number;
  confidence: number;
}

interface CompareFacesResponse {
  success: boolean;
  result?: CompareResult;
  processingTime: number;
  error?: string;
}

const compareFaces = async (sourceImage: string, targetImage: string, threshold: number): Promise<CompareFacesResponse> => {
  const start = Date.now();
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
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Compare these two faces:" },
              { type: "image_url", image_url: { url: sourceImage.startsWith("http") ? sourceImage : `data:image/jpeg;base64,${sourceImage}` } },
              { type: "image_url", image_url: { url: targetImage.startsWith("http") ? targetImage : `data:image/jpeg;base64,${targetImage}` } }
            ]
          }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) throw new Error(`AI gateway error: ${response.status}`);
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);

    return {
      success: true,
      result: { 
        matched: result.matched || (result.similarity >= threshold), 
        similarity: result.similarity, 
        confidence: result.confidence 
      },
      processingTime: Date.now() - start,
    };
  } catch (e) {
    log.error("AI Comparison failed", { error: e instanceof Error ? e.message : 'Error' });
    return { success: false, processingTime: Date.now() - start, error: e instanceof Error ? e.message : 'Error' };
  }
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const rl = checkRateLimit(req, RATE_LIMITS.ai, "compare-faces", corsHeaders);
  if (!rl.allowed) return rl.response;

  try {
    const rawBody = await req.json();
    const validation = validateInput(compareFacesSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const { sourceImage, targetImage, threshold } = validation.data;

    log.info("Comparing faces", { threshold });
    const result = await compareFaces(sourceImage, targetImage, threshold);
    log.info("Comparison complete", { matched: result.result?.matched, similarity: result.result?.similarity });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  } catch (e) {
    log.error("Unhandled error", { error: e instanceof Error ? e.message : "Unknown" });
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
