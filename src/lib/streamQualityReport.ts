/**
 * VISÃO - Relatório de qualidade de stream por câmera.
 * Gera PDF com métricas (latência, jitter, loss, codec) e sugestões acionáveis.
 */
import type { ValidationResult } from '@/hooks/useRtspValidation';
import { downloadPDF, generatePDFReport, type ReportData, type ReportSection } from './pdfGenerator';

export interface StreamReportCamera {
  id: string;
  name: string;
  location?: string | null;
  model?: string | null;
}

export interface StreamReportInput {
  camera: StreamReportCamera;
  results: Partial<Record<'primary' | 'substream', ValidationResult | null>>;
  historyRows?: Array<{ created_at: string; status: string; latency_ms: number; http_code: number; message: string | null }>;
}

const severityLabel = (s: string) => (s === 'critical' ? '🔴 Crítico' : s === 'warn' ? '🟡 Atenção' : '🔵 Info');
const scoreLabel = (s?: string | null) => (!s ? '—' : s === 'ok' ? '✅ OK' : s === 'warn' ? '⚠️ Warn' : '❌ Crítico');

function buildTargetSections(target: 'primary' | 'substream', r: ValidationResult): ReportSection[] {
  const title = target === 'primary' ? 'Stream Principal' : 'Substream (IA)';
  const summary: ReportSection = {
    title,
    type: 'summary',
    data: [
      { label: 'Score', value: scoreLabel(r.score) },
      { label: 'Latência p95', value: `${r.latency.p95} ms` },
      { label: 'Jitter', value: `${r.latency.jitter} ms` },
      { label: 'Perda', value: `${r.loss_pct}%` },
      { label: 'Latência avg', value: `${r.latency.avg} ms` },
      { label: 'Amostras', value: r.samples },
      { label: 'Codec', value: r.codec ?? '—' },
      { label: 'Resolução @ FPS', value: `${r.resolution ?? '—'}${r.fps ? ` @ ${r.fps}` : ''}` },
    ],
  };
  const samplesTable: ReportSection = {
    title: `${title} — Amostras`,
    type: 'table',
    data: {
      headers: ['#', 'Status', 'HTTP', 'Latência (ms)'],
      rows: r.samples_detail.map((s, i) => [i + 1, s.ok ? 'OK' : 'FAIL', s.status || '—', s.ms]),
    },
  };
  const suggestions: ReportSection = {
    title: `${title} — Sugestões acionáveis`,
    type: 'text',
    data: r.suggestions.length
      ? r.suggestions.map((s) => `${severityLabel(s.severity)} [${s.code}] ${s.message}`).join('\n')
      : 'Nenhuma sugestão — stream saudável.',
  };
  const sections = [summary, samplesTable, suggestions];
  if (r.warnings.length) {
    sections.push({ title: `${title} — Avisos`, type: 'text', data: r.warnings.map((w) => `• ${w}`).join('\n') });
  }
  return sections;
}

export async function buildStreamQualityReport(input: StreamReportInput): Promise<ReportData> {
  const { camera, results, historyRows } = input;
  const sections: ReportSection[] = [
    {
      title: 'Identificação',
      type: 'summary',
      data: [
        { label: 'Câmera', value: camera.name },
        { label: 'Local', value: camera.location ?? '—' },
        { label: 'Modelo', value: camera.model ?? '—' },
        { label: 'ID', value: camera.id.slice(0, 8) },
      ],
    },
  ];

  (['primary', 'substream'] as const).forEach((t) => {
    const r = results[t];
    if (r) sections.push(...buildTargetSections(t, r));
  });

  if (historyRows && historyRows.length) {
    sections.push({
      title: 'Histórico recente (stream_health_checks)',
      type: 'table',
      data: {
        headers: ['Data', 'Status', 'HTTP', 'Latência (ms)', 'Mensagem'],
        rows: historyRows.slice(0, 20).map((h) => [
          new Date(h.created_at).toLocaleString('pt-BR'),
          h.status.toUpperCase(),
          h.http_code || '—',
          h.latency_ms,
          (h.message ?? '').slice(0, 40),
        ]),
      },
    });
  }

  return {
    title: `Relatório de Qualidade — ${camera.name}`,
    subtitle: 'Latência, jitter, perda, codec e sugestões acionáveis',
    dateRange: { start: new Date(Date.now() - 24 * 3600 * 1000), end: new Date() },
    generatedAt: new Date(),
    sections,
  };
}

export async function generateAndDownloadStreamReport(input: StreamReportInput): Promise<void> {
  const data = await buildStreamQualityReport(input);
  const doc = await generatePDFReport(data);
  const safeName = input.camera.name.replace(/[^a-z0-9-_]+/gi, '_').toLowerCase();
  downloadPDF(doc, `relatorio_stream_${safeName}`);
}
