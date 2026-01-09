// Report Store - Projeto VISÃO
// Gerenciamento de relatórios com tipagem forte

import { create } from 'zustand';

export type ReportType = 'alerts' | 'cameras' | 'recognition' | 'zones' | 'analytics' | 'audit';
export type ReportFormat = 'pdf' | 'xlsx' | 'csv' | 'json';
export type ReportStatus = 'pending' | 'generating' | 'ready' | 'failed' | 'expired';

export interface ReportConfig {
  type: ReportType;
  title: string;
  dateFrom: Date;
  dateTo: Date;
  filters?: Record<string, string | number | boolean>;
  format: ReportFormat;
  includeCharts?: boolean;
  groupBy?: string;
}

export interface Report {
  id: string;
  config: ReportConfig;
  status: ReportStatus;
  progress: number;
  url?: string;
  size?: number;
  error?: string;
  createdAt: Date;
  expiresAt?: Date;
}

export interface ReportState {
  reports: Report[];
  generating: boolean;
  currentReport: Report | null;
}

export interface ReportActions {
  generate: (config: ReportConfig) => Promise<string>;
  download: (id: string) => void;
  delete: (id: string) => void;
  getReport: (id: string) => Report | undefined;
  getByType: (type: ReportType) => Report[];
  clearExpired: () => void;
}

const initialState: ReportState = {
  reports: [],
  generating: false,
  currentReport: null,
};

export const useReportStore = create<ReportState & ReportActions>((set, get) => ({
  ...initialState,

  generate: async (config) => {
    const id = crypto.randomUUID();
    const report: Report = {
      id,
      config,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    };

    set((state) => ({
      reports: [report, ...state.reports],
      generating: true,
      currentReport: report,
    }));

    try {
      set((state) => ({
        reports: state.reports.map((r) =>
          r.id === id ? { ...r, status: 'generating' as const, progress: 10 } : r
        ),
      }));

      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await response.json();

      set((state) => ({
        reports: state.reports.map((r) =>
          r.id === id
            ? {
                ...r,
                status: 'ready' as const,
                progress: 100,
                url: data.url,
                size: data.size,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              }
            : r
        ),
        generating: false,
        currentReport: null,
      }));

      return id;
    } catch (error) {
      set((state) => ({
        reports: state.reports.map((r) =>
          r.id === id
            ? { ...r, status: 'failed' as const, error: error instanceof Error ? error.message : 'Erro' }
            : r
        ),
        generating: false,
        currentReport: null,
      }));
      throw error;
    }
  },

  download: (id) => {
    const report = get().reports.find((r) => r.id === id);
    if (report?.url) {
      window.open(report.url, '_blank');
    }
  },

  delete: (id) => set((state) => ({
    reports: state.reports.filter((r) => r.id !== id),
  })),

  getReport: (id) => get().reports.find((r) => r.id === id),

  getByType: (type) => get().reports.filter((r) => r.config.type === type),

  clearExpired: () => {
    const now = new Date();
    set((state) => ({
      reports: state.reports.filter((r) => !r.expiresAt || r.expiresAt > now),
    }));
  },
}));

export default useReportStore;
