/**
 * AI Store
 * State for AI analysis
 */
import { create } from 'zustand';

export interface AIAnalysis { id: string; type: string; result: any; confidence: number; timestamp: Date; }

interface AIState {
  analyses: AIAnalysis[];
  isProcessing: boolean;
  currentModel: string;
  addAnalysis: (analysis: AIAnalysis) => void;
  clearAnalyses: () => void;
  setProcessing: (processing: boolean) => void;
  setModel: (model: string) => void;
}

export const useAIStore = create<AIState>((set) => ({
  analyses: [],
  isProcessing: false,
  currentModel: 'gpt-4',
  addAnalysis: (analysis) => set((s) => ({ analyses: [analysis, ...s.analyses].slice(0, 100) })),
  clearAnalyses: () => set({ analyses: [] }),
  setProcessing: (isProcessing) => set({ isProcessing }),
  setModel: (currentModel) => set({ currentModel }),
}));

export default useAIStore;
