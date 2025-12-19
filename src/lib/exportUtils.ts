import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExportableAlert {
  id: string;
  camera_name: string;
  type: string;
  severity: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  [key: string]: unknown;
}

interface ExportableCamera {
  id: string;
  name: string;
  location: string;
  status: string;
  detected_people: number | null;
  alerts_count: number | null;
  [key: string]: unknown;
}

// CSV Export
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const keys = headers ? headers.map(h => h.key) : (Object.keys(data[0]) as (keyof T)[]);
  const headerLabels = headers ? headers.map(h => h.label) : keys.map(String);

  const csvContent = [
    headerLabels.join(','),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      }).join(',')
    )
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// PDF Export (simple HTML-based)
export function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  title: string,
  headers?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) return;

  const keys = headers ? headers.map(h => h.key) : (Object.keys(data[0]) as (keyof T)[]);
  const headerLabels = headers ? headers.map(h => h.label) : keys.map(String);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
        h1 { color: #1a1a2e; margin-bottom: 10px; }
        .date { color: #666; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #0ea5e9; color: white; padding: 12px 8px; text-align: left; font-size: 12px; }
        td { padding: 10px 8px; border-bottom: 1px solid #ddd; font-size: 11px; }
        tr:nth-child(even) { background: #f9fafb; }
        .footer { margin-top: 30px; font-size: 10px; color: #666; text-align: center; }
        .severity-critical { color: #dc2626; font-weight: bold; }
        .severity-high { color: #ea580c; font-weight: bold; }
        .severity-medium { color: #d97706; }
        .severity-low { color: #6b7280; }
        .status-online { color: #16a34a; }
        .status-offline { color: #6b7280; }
        .status-alert { color: #dc2626; }
        .status-warning { color: #d97706; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="date">Gerado em: ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}</div>
      <table>
        <thead>
          <tr>
            ${headerLabels.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>
              ${keys.map(key => {
                const value = row[key];
                let cellClass = '';
                const strKey = String(key);
                const strValue = String(value ?? '');
                
                if (strKey === 'severity') {
                  cellClass = `severity-${strValue}`;
                } else if (strKey === 'status') {
                  cellClass = `status-${strValue}`;
                }
                
                return `<td class="${cellClass}">${formatValue(value, strKey)}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="footer">
        Relatório gerado automaticamente pelo Sistema de Vigilância Inteligente
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

function formatValue(value: unknown, key: string): string {
  if (value === null || value === undefined) return '-';
  
  if (key === 'timestamp' || key === 'created_at' || key === 'updated_at') {
    return format(new Date(String(value)), "dd/MM/yyyy HH:mm", { locale: ptBR });
  }
  
  if (key === 'is_read') {
    return value ? 'Sim' : 'Não';
  }
  
  if (key === 'severity') {
    const severityMap: Record<string, string> = {
      low: 'Baixo',
      medium: 'Médio',
      high: 'Alto',
      critical: 'Crítico'
    };
    return severityMap[String(value)] || String(value);
  }
  
  if (key === 'status') {
    const statusMap: Record<string, string> = {
      online: 'Online',
      offline: 'Offline',
      alert: 'Alerta',
      warning: 'Aviso'
    };
    return statusMap[String(value)] || String(value);
  }
  
  if (key === 'type') {
    const typeMap: Record<string, string> = {
      security: 'Segurança',
      safety: 'EPI',
      operations: 'Operações',
      access: 'Acesso',
      analytics: 'Analytics'
    };
    return typeMap[String(value)] || String(value);
  }
  
  return String(value);
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Alert export helpers
export const alertExportHeaders = [
  { key: 'timestamp' as const, label: 'Data/Hora' },
  { key: 'camera_name' as const, label: 'Câmera' },
  { key: 'type' as const, label: 'Tipo' },
  { key: 'severity' as const, label: 'Severidade' },
  { key: 'message' as const, label: 'Mensagem' },
  { key: 'is_read' as const, label: 'Lido' },
];

export const cameraExportHeaders = [
  { key: 'name' as const, label: 'Nome' },
  { key: 'location' as const, label: 'Localização' },
  { key: 'status' as const, label: 'Status' },
  { key: 'detected_people' as const, label: 'Pessoas Detectadas' },
  { key: 'alerts_count' as const, label: 'Alertas' },
];

export function exportAlerts(alerts: ExportableAlert[], format: 'csv' | 'pdf') {
  const filename = `alertas_${format === 'csv' ? new Date().toISOString().split('T')[0] : ''}`;
  
  if (format === 'csv') {
    exportToCSV(alerts, filename, alertExportHeaders);
  } else {
    exportToPDF(alerts, filename, 'Relatório de Alertas', alertExportHeaders);
  }
}

export function exportCameras(cameras: ExportableCamera[], format: 'csv' | 'pdf') {
  const filename = `cameras_${format === 'csv' ? new Date().toISOString().split('T')[0] : ''}`;
  
  if (format === 'csv') {
    exportToCSV(cameras, filename, cameraExportHeaders);
  } else {
    exportToPDF(cameras, filename, 'Relatório de Câmeras', cameraExportHeaders);
  }
}
