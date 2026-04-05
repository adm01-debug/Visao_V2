import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from "../_shared/cors.ts";
import { compareFacesSchema, validateInput } from "../_shared/validation.ts";

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
    const similarity = Math.random();
    return {
      success: true,
      result: { matched: similarity >= threshold, similarity, confidence: similarity * 100 },
      processingTime: Date.now() - start,
    };
  } catch (e) {
    return { success: false, processingTime: Date.now() - start, error: e instanceof Error ? e.message : 'Error' };
  }
};

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const rawBody = await req.json();
    const validation = validateInput(compareFacesSchema, rawBody, corsHeaders);
    if (!validation.success) return validation.response;
    const { sourceImage, targetImage, threshold } = validation.data;

    const result = await compareFaces(sourceImage, targetImage, threshold);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
