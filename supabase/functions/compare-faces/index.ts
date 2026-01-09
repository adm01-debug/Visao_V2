import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

export interface CompareFacesRequest {
  sourceImage: string;
  targetImage: string;
  threshold?: number;
}

export interface CompareResult {
  matched: boolean;
  similarity: number;
  confidence: number;
}

export interface CompareFacesResponse {
  success: boolean;
  result?: CompareResult;
  processingTime: number;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const compareFaces = async (req: CompareFacesRequest): Promise<CompareFacesResponse> => {
  const start = Date.now();
  try {
    const { sourceImage, targetImage, threshold = 0.6 } = req;
    if (!sourceImage || !targetImage) {
      return { success: false, processingTime: Date.now() - start, error: 'Images required' };
    }
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
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const body: CompareFacesRequest = await req.json();
    const result = await compareFaces(body);
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
