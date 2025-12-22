import { retry, withRetry } from "@/lib/retry";
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type AnalysisType = 'security' | 'productivity' | 'safety';

export interface Detection {
  type: 'person' | 'vehicle' | 'object' | 'behavior';
  label: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  position?: { area: string };
}

export interface AnalysisAlert {
  type: 'security' | 'safety' | 'operations' | 'access';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendation: string;
}

export interface SecurityAnalysis {
  people_count: number;
  detections: Detection[];
  alerts: AnalysisAlert[];
  summary: string;
}

export interface ProductivityAnalysis {
  people_count: number;
  working_count: number;
  idle_count: number;
  occupancy_rate: number;
  observations: string[];
  summary: string;
}

export interface SafetyAnalysis {
  people_count: number;
  ppe_compliance: {
    compliant: number;
    non_compliant: number;
    missing_items: string[];
  };
  hazards: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    location: string;
  }[];
  summary: string;
}

export type AnalysisResult = SecurityAnalysis | ProductivityAnalysis | SafetyAnalysis;

export function useImageAnalysis() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysis, setLastAnalysis] = useState<AnalysisResult | null>(null);
  const { toast } = useToast();

  const analyzeImage = async (
    imageSource: { url?: string; base64?: string },
    analysisType: AnalysisType = 'security'
  ): Promise<AnalysisResult | null> => {
    setIsAnalyzing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-image', {
        body: {
          imageUrl: imageSource.url,
          imageBase64: imageSource.base64,
          analysisType
        }
      });

      if (error) {
        throw error;
      }

      if (!data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      const analysis = data.analysis as AnalysisResult;
      setLastAnalysis(analysis);

      toast({
        title: 'Análise concluída',
        description: `Detectadas ${analysis.people_count} pessoa(s)`,
      });

      return analysis;

    } catch (error) {
      // rm
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      toast({
        title: 'Erro na análise',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeFromFile = async (
    file: File,
    analysisType: AnalysisType = 'security'
  ): Promise<AnalysisResult | null> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        if (base64) {
          const result = await analyzeImage({ base64 }, analysisType);
          resolve(result);
        } else {
          resolve(null);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  return {
    analyzeImage,
    analyzeFromFile,
    isAnalyzing,
    lastAnalysis,
  };
}
