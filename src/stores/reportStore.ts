/**
 * Report Store
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Report { id: string; title: string; type: string; data: any; generatedAt: Date; status: 'pending' | 'ready' | 'error'; }

interface ReportState {
  reports: Report[];
  isGenerating: boolean;
  addReport: (report: Report) => void;
  updateReport: (id: string, updates: Partial<Report>) => void;
  removeReport: (id: string) => void;
  setGenerating: (generating: boolean) => void;
}

export const useReportStore = create<ReportState>()(persist((set) => ({
  reports: [],
  isGenerating: false,
  addReport: (report) => set((s) => ({ reports: [report, ...s.reports] })),
  updateReport: (id, updates) => set((s) => ({ reports: s.reports.map(r => r.id === id ? { ...r, ...updates } : r) })),
  removeReport: (id) => set((s) => ({ reports: s.reports.filter(r => r.id !== id) })),
  setGenerating: (isGenerating) => set({ isGenerating }),
}), { name: 'report-store' }));

export default useReportStore;
