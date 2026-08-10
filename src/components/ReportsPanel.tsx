/**
 * VISÃO - ReportsPanel (Refactored)
 */
import { logger } from '@/lib/logger';
import { useState } from 'react';
import { subDays } from 'date-fns';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { generatePDFReport, downloadPDF, type ReportData } from '@/lib/pdfGenerator';
import { ReportTypeSelector, reportTypes } from './reports/ReportTypeSelector';
import { ReportDateSelector } from './reports/ReportDateSelector';
import { ReportHistory } from './reports/ReportHistory';

export function ReportsPanel() {
  const [selectedReport, setSelectedReport] = useState('alerts');
  const [dateRange, setDateRange] = useState({ start: subDays(new Date(), 7), end: new Date() });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<
    { id: string; date: Date; type: string }[]
  >([]);

  const currentReportType = reportTypes.find((r) => r.id === selectedReport);

  const handleGenerateReport = async () => {
    if (!currentReportType) return;
    setIsGenerating(true);
    toast.info('Gerando relatório...', { duration: 2000 });
    try {
      const reportData = await fetchReportData(selectedReport, dateRange);
      const doc = await generatePDFReport(reportData);
      downloadPDF(doc, `visao_${selectedReport}`);
      setGeneratedReports((prev) => [
        { id: crypto.randomUUID(), date: new Date(), type: currentReportType.title },
        ...prev.slice(0, 9),
      ]);
      toast.success('Relatório gerado com sucesso!');
    } catch (error) {
      logger.error('Erro ao gerar relatório:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">Gere relatórios em PDF do sistema</p>
        </div>
        <Badge variant="outline" className="gap-1">
          <FileText className="w-3 h-3" />
          PDF Export
        </Badge>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <ReportTypeSelector selectedReport={selectedReport} onSelect={setSelectedReport} />
          <ReportDateSelector dateRange={dateRange} onDateRangeChange={setDateRange} />
          <Button
            size="lg"
            className="w-full gap-2"
            onClick={handleGenerateReport}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gerando relatório...
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                Gerar e Baixar PDF
              </>
            )}
          </Button>
        </div>
        <ReportHistory reports={generatedReports} />
      </div>
    </div>
  );
}

async function fetchReportData(
  type: string,
  range: { start: Date; end: Date }
): Promise<ReportData> {
  const sections: ReportData['sections'] = [];

  if (type === 'alerts') {
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString())
      .order('timestamp', { ascending: false });
    const list = alerts || [];
    const bySev = {
      critical: list.filter((a) => a.severity === 'critical').length,
      high: list.filter((a) => a.severity === 'high').length,
      medium: list.filter((a) => a.severity === 'medium').length,
      low: list.filter((a) => a.severity === 'low').length,
    };
    sections.push({
      title: 'Resumo',
      type: 'summary',
      data: [
        { label: 'Total de Alertas', value: list.length },
        { label: 'Críticos', value: bySev.critical },
        { label: 'Alta Prioridade', value: bySev.high },
        { label: 'Média Prioridade', value: bySev.medium },
      ],
    });
    sections.push({
      title: 'Histórico de Alertas',
      type: 'table',
      data: {
        headers: ['Data/Hora', 'Câmera', 'Tipo', 'Severidade', 'Mensagem'],
        rows: list
          .slice(0, 50)
          .map((a) => [
            format(new Date(a.timestamp), 'dd/MM/yy HH:mm', { locale: ptBR }),
            a.camera_name,
            a.type,
            a.severity,
            a.message.substring(0, 30),
          ]),
      },
    });
    return {
      title: 'Relatório de Alertas',
      subtitle: `Análise completa de ${list.length} alertas no período`,
      dateRange: range,
      generatedAt: new Date(),
      sections,
    };
  }

  if (type === 'recognition') {
    const { data: logs } = await supabase
      .from('recognition_logs')
      .select('*, registered_persons(name)')
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString())
      .order('timestamp', { ascending: false });
    const list = logs || [];
    const recognized = list.filter((l) => l.recognized).length;
    const avgConf =
      list.length > 0 ? list.reduce((a, l) => a + (l.confidence || 0), 0) / list.length : 0;
    sections.push({
      title: 'Resumo',
      type: 'summary',
      data: [
        { label: 'Total Detecções', value: list.length },
        { label: 'Reconhecidos', value: recognized },
        { label: 'Desconhecidos', value: list.length - recognized },
        { label: 'Confiança Média', value: `${(avgConf * 100).toFixed(1)}%` },
      ],
    });
    sections.push({
      title: 'Logs de Reconhecimento',
      type: 'table',
      data: {
        headers: ['Data/Hora', 'Pessoa', 'Status', 'Confiança'],
        rows: list
          .slice(0, 50)
          .map((l) => [
            format(new Date(l.timestamp), 'dd/MM/yy HH:mm', { locale: ptBR }),
            l.person_id || 'Desconhecido',
            l.recognized ? 'Reconhecido' : 'Não reconhecido',
            `${((l.confidence || 0) * 100).toFixed(1)}%`,
          ]),
      },
    });
    return {
      title: 'Relatório de Reconhecimento Facial',
      subtitle: `${list.length} detecções registradas`,
      dateRange: range,
      generatedAt: new Date(),
      sections,
    };
  }

  if (type === 'cameras') {
    const { data: cameras } = await supabase.from('cameras').select('*');
    const list = cameras || [];
    sections.push({
      title: 'Resumo',
      type: 'summary',
      data: [
        { label: 'Total Câmeras', value: list.length },
        { label: 'Online', value: list.filter((c) => c.status === 'online').length },
        { label: 'Offline', value: list.filter((c) => c.status === 'offline').length },
        { label: 'Em Alerta', value: list.filter((c) => c.status === 'alert').length },
      ],
    });
    sections.push({
      title: 'Status das Câmeras',
      type: 'table',
      data: {
        headers: ['Nome', 'Localização', 'Status', 'Pessoas', 'Alertas'],
        rows: list.map((c) => [
          c.name,
          c.location,
          c.status,
          c.detected_people || 0,
          c.alerts_count || 0,
        ]),
      },
    });
    return {
      title: 'Relatório de Câmeras',
      subtitle: `Status de ${list.length} câmeras do sistema`,
      dateRange: range,
      generatedAt: new Date(),
      sections,
    };
  }

  if (type === 'analytics') {
    const { data: alerts } = await supabase
      .from('alerts')
      .select('*')
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString());
    const { data: logs } = await supabase
      .from('recognition_logs')
      .select('*')
      .gte('timestamp', range.start.toISOString())
      .lte('timestamp', range.end.toISOString());
    const { data: cameras } = await supabase.from('cameras').select('*');
    const { data: zones } = await supabase.from('zones').select('*');
    sections.push({
      title: 'Visão Geral',
      type: 'summary',
      data: [
        { label: 'Alertas', value: (alerts || []).length },
        { label: 'Detecções', value: (logs || []).length },
        { label: 'Câmeras', value: (cameras || []).length },
        { label: 'Zonas', value: (zones || []).length },
      ],
    });
    sections.push({
      title: 'Análise',
      type: 'text',
      data: `Este relatório consolidado apresenta uma visão geral do sistema no período selecionado.`,
    });
    return {
      title: 'Relatório Analítico Consolidado',
      subtitle: 'Métricas e indicadores do sistema',
      dateRange: range,
      generatedAt: new Date(),
      sections,
    };
  }

  return { title: 'Relatório', dateRange: range, generatedAt: new Date(), sections: [] };
}

export default ReportsPanel;
