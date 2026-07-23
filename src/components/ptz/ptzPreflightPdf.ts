/**
 * Geração lazy do relatório PDF do pré-voo multi-eixo.
 * jsPDF é carregado dinamicamente para não impactar o bundle.
 */

export type PreflightAxisLike = 'pan' | 'tilt' | 'zoom';
export type PreflightPhaseId = 'A' | 'B' | 'C';
export type PreflightOutcome = 'ok' | 'deviation' | 'fail' | 'no-telemetry' | 'skipped';

export interface PreflightPdfPhase {
  axis: PreflightAxisLike;
  id: PreflightPhaseId;
  target: number;
  observed: number | null;
  delta: number | null;
  latency_ms: number;
  outcome: PreflightOutcome;
  detail?: string;
}

export interface PreflightPdfInput {
  cameraId?: string;
  cameraLabel?: string;
  axes: PreflightAxisLike[];
  limitsByAxis: Record<PreflightAxisLike, { min: number; max: number }>;
  startPositions: Record<PreflightAxisLike, number>;
  perAxisTimeoutMs: Record<PreflightAxisLike, number>;
  statusSupported: boolean;
  results: PreflightPdfPhase[];
  generatedAt?: Date;
}

const AXIS_LABEL: Record<PreflightAxisLike, string> = {
  pan: 'Horizontal (Pan)',
  tilt: 'Vertical (Tilt)',
  zoom: 'Zoom',
};

const OUTCOME_LABEL: Record<PreflightOutcome, string> = {
  ok: 'OK',
  deviation: 'DESVIO',
  fail: 'FALHA',
  'no-telemetry': 'SEM TELEMETRIA',
  skipped: 'PULADO',
};

// Cores RGB (não usar tokens semânticos aqui — jsPDF é canvas puro).
const OUTCOME_RGB: Record<PreflightOutcome, [number, number, number]> = {
  ok: [22, 163, 74],
  deviation: [217, 119, 6],
  fail: [220, 38, 38],
  'no-telemetry': [100, 116, 139],
  skipped: [100, 116, 139],
};

const phaseTargetLabel = (
  id: PreflightPhaseId,
  limits: { min: number; max: number },
  origin: number,
): string => {
  if (id === 'A') return `min (${limits.min.toFixed(3)})`;
  if (id === 'B') return `max (${limits.max.toFixed(3)})`;
  return `origem (${origin.toFixed(3)})`;
};

export async function generatePtzPreflightPdf(input: PreflightPdfInput): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const autoTableModule = await import('jspdf-autotable');
  const autoTable = (autoTableModule.default ?? autoTableModule) as (
    doc: unknown,
    options: Record<string, unknown>,
  ) => void;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const generatedAt = input.generatedAt ?? new Date();
  const stamp = generatedAt.toLocaleString('pt-BR');

  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Relatório de Pré-voo PTZ', 40, 50);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const headerLines = [
    `Câmera: ${input.cameraLabel ?? input.cameraId ?? '—'}`,
    `Eixos validados: ${input.axes.map((a) => AXIS_LABEL[a]).join(' → ')}`,
    `Telemetria: ${input.statusSupported ? 'ONVIF GetStatus' : 'Fallback por tempo'}`,
    `Data/hora: ${stamp}`,
  ];
  headerLines.forEach((line, i) => doc.text(line, 40, 72 + i * 14));

  // Resumo global
  const totals = input.results.reduce(
    (acc, r) => {
      acc[r.outcome] = (acc[r.outcome] ?? 0) + 1;
      return acc;
    },
    {} as Record<PreflightOutcome, number>,
  );
  const summaryText = (['ok', 'deviation', 'no-telemetry', 'fail', 'skipped'] as PreflightOutcome[])
    .filter((o) => (totals[o] ?? 0) > 0)
    .map((o) => `${OUTCOME_LABEL[o]}: ${totals[o]}`)
    .join('   ·   ');
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo:', 40, 140);
  doc.setFont('helvetica', 'normal');
  doc.text(summaryText || 'Sem fases executadas.', 90, 140);

  let cursorY = 160;

  for (const axis of input.axes) {
    const rows = (['A', 'B', 'C'] as PreflightPhaseId[]).map((phaseId) => {
      const r = input.results.find((x) => x.axis === axis && x.id === phaseId);
      const target = phaseTargetLabel(axis, phaseId, input.limitsByAxis[axis], input.startPositions[axis] ?? 0);
      if (!r) {
        return [`Fase ${phaseId}`, target, '—', '—', '—', 'AGUARDANDO', ''];
      }
      return [
        `Fase ${phaseId}`,
        target,
        r.observed != null ? r.observed.toFixed(3) : '—',
        r.delta != null ? r.delta.toFixed(3) : '—',
        `${r.latency_ms} ms`,
        OUTCOME_LABEL[r.outcome],
        r.detail ?? '',
      ];
    });

    const timeoutSec = ((input.perAxisTimeoutMs[axis] ?? 0) / 1000).toFixed(1);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(
      `${AXIS_LABEL[axis]}  ·  timeout/fase: ${timeoutSec}s  ·  limites: [${input.limitsByAxis[axis].min.toFixed(2)}, ${input.limitsByAxis[axis].max.toFixed(2)}]`,
      40,
      cursorY,
    );
    cursorY += 8;

    autoTable(doc, {
      startY: cursorY,
      head: [['Fase', 'Alvo', 'Observado', 'Δ', 'Latência', 'Resultado', 'Detalhe']],
      body: rows,
      styles: { fontSize: 9, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: 255 },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 110 },
        2: { cellWidth: 65 },
        3: { cellWidth: 55 },
        4: { cellWidth: 60 },
        5: { cellWidth: 90 },
        6: { cellWidth: 'auto' },
      },
      didParseCell: (data: {
        section: string;
        column: { index: number };
        cell: { text: string[]; styles: { fillColor?: [number, number, number]; textColor?: number } };
      }) => {
        if (data.section === 'body' && data.column.index === 5) {
          const text = data.cell.text?.[0] as string | undefined;
          const outcome = (Object.keys(OUTCOME_LABEL) as PreflightOutcome[]).find(
            (k) => OUTCOME_LABEL[k] === text,
          );
          if (outcome) {
            data.cell.styles.fillColor = OUTCOME_RGB[outcome];
            data.cell.styles.textColor = 255;
          }
        }
      },
      margin: { left: 40, right: 40 },
    });

    // finalY é anexado pelo autoTable
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY + 80;
    cursorY = finalY + 24;

    if (cursorY > 760) {
      doc.addPage();
      cursorY = 60;
    }
  }

  // Rodapé com carimbo em todas as páginas
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `VISÃO · Pré-voo PTZ · gerado em ${stamp} · página ${i}/${pageCount}`,
      40,
      820,
    );
    doc.setTextColor(0);
  }

  return doc.output('blob');
}

export function downloadPtzPreflightPdf(blob: Blob, cameraLabel?: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeLabel = (cameraLabel ?? 'camera').replace(/[^a-z0-9-_]+/gi, '_').slice(0, 40);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `preflight-ptz_${safeLabel}_${ts}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
