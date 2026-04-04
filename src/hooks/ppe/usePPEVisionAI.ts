/**
 * VISÃO - PPE Vision AI Detection
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { PPEType, PPEItem, PPEStatus } from './types';

export function usePPEVisionAI() {
  const detectWithVisionAI = useCallback(async (imageData: string, requiredPPE: PPEType[]): Promise<PPEItem[]> => {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          image: imageData,
          analysisType: 'ppe',
          prompt: `Analyze this image for Personal Protective Equipment (PPE).
For each of the following items, determine if it is:
- "detected": clearly visible and worn by the person
- "missing": not visible or not worn
- "unknown": cannot determine

Required PPE to check: ${requiredPPE.join(', ')}

Respond in JSON format:
{
  "items": [
    { "type": "helmet", "status": "detected", "confidence": 0.95 },
    { "type": "vest", "status": "missing", "confidence": 0.90 }
  ]
}`,
        },
      });
      if (error) throw error;
      const response = data?.analysis || data;
      if (response?.items) {
        return response.items.map((item: Record<string, unknown>) => ({
          type: item.type as PPEType,
          status: item.status as PPEStatus,
          confidence: (item.confidence as number) || 0.8,
          detectionMethod: 'vision-ai' as const,
        }));
      }
      return [];
    } catch { return []; }
  }, []);

  return { detectWithVisionAI };
}
