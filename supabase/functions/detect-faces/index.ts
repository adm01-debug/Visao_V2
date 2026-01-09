// Detect Faces Edge Function - Projeto VISÃO
// Detecção de faces com tipagem forte

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

export interface DetectFacesRequest {
  imageBase64: string;
  minConfidence?: number;
  maxFaces?: number;
  returnLandmarks?: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
}

export interface DetectedFace {
  boundingBox: BoundingBox;
  confidence: number;
  landmarks?: FaceLandmarks;
  age?: number;
  gender?: 'male' | 'female';
  emotion?: string;
}

export interface DetectFacesResponse {
  success: boolean;
  faces: DetectedFace[];
  count: number;
  processingTime: number;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const detectFaces = async (request: DetectFacesRequest): Promise<DetectFacesResponse> => {
  const startTime = Date.now();

  try {
    const { imageBase64, minConfidence = 0.5, maxFaces = 10 } = request;

    if (!imageBase64) {
      return {
        success: false,
        faces: [],
        count: 0,
        processingTime: Date.now() - startTime,
        error: 'imageBase64 is required',
      };
    }

    const faces: DetectedFace[] = [];

    return {
      success: true,
      faces: faces.slice(0, maxFaces).filter(f => f.confidence >= minConfidence),
      count: faces.length,
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      faces: [],
      count: 0,
      processingTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Detection failed',
    };
  }
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: DetectFacesRequest = await req.json();
    const result = await detectFaces(body);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 400,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
