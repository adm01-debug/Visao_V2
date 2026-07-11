import { CheckCircle2, XCircle, HelpCircle, AlertTriangle } from 'lucide-react';
import type { ReviewVerdict, SourceTable } from '@/hooks/useDetectionReviews';

export interface UnifiedDetection {
  source_table: SourceTable;
  source_id: string;
  timestamp: string;
  camera_id: string | null;
  camera_name: string;
  risk_type: string;
  model_name: string;
  title: string;
  subtitle: string;
  confidence: number | null;
  thumbnail: string | null;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export const VERDICT_META: Record<ReviewVerdict, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  true_positive: { label: 'Verdadeiro Positivo', icon: CheckCircle2, tone: 'text-success' },
  false_positive: { label: 'Falso Positivo', icon: XCircle, tone: 'text-destructive' },
  false_negative: { label: 'Falso Negativo', icon: AlertTriangle, tone: 'text-warning' },
  uncertain: { label: 'Incerto', icon: HelpCircle, tone: 'text-muted-foreground' },
};

export const VERDICT_BG: Record<ReviewVerdict, string> = {
  true_positive: 'bg-success/10 ring-success/40',
  false_positive: 'bg-destructive/10 ring-destructive/40',
  false_negative: 'bg-warning/10 ring-warning/40',
  uncertain: 'bg-muted ring-border',
};
