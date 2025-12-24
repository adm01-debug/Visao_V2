import { logger } from "@/lib/logger";
import { formatDate, formatNumber } from "@/lib/formatters";
import { generatePDF } from '@/lib/pdfGenerator';
import { exportToCSV } from '@/lib/exportUtils';
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: Painel de Relatórios
 */

import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  Users,
  Camera,
  BarChart3,
  Clock,
  Filter,
  Loader2,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { generatePDFReport, downloadPDF, type ReportData } from '@/lib/pdfGenerator';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: any;
  sections: string[];
}

const reportTypes: ReportType[] = [
  {
    id: 'alerts',
    title: 'Relatório de Alertas',
    description: 'Histórico completo de alertas com análise por severidade e câmera',
    icon: AlertTriangle,
    sections: ['summary', 'by-severity', 'by-camera', 'timeline'],
  },
  {
    id: 'recognition',
    title: 'Relatório de Reconhecimento',
    description: 'Logs de reconhecimento facial com estatísticas de detecção',
    icon: Users,
    sections: ['summary', 'by-person', 'by-camera', 'unknown'],
  },
  {
    id: 'cameras',
    title: 'Relatório de Câmeras',
    description: 'Status e atividade das câmeras do sistema',
    icon: Camera,
    sections: ['summary', 'status', 'activity'],
  },
  {
    id: 'analytics',
    title: 'Relatório Analítico',
    description: 'Análise consolidada com métricas e tendências',
    icon: BarChart3,
    sections: ['overview', 'trends', 'recommendations'],
  },
];

export function ReportsPanel() {
  const [selectedReport, setSelectedReport] = useState<string>('alerts');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>({
    start: subDays(new Date(), 7),
    end: new Date(),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [generatedReports, setGeneratedReports] = useState<{ id: string; date: Date; type: string }[]>([]);

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

  const fetchReportData = async (
    type: string,
    range: { start: Date; end: Date }
  ): Promise<ReportData> => {
    const sections: ReportData['sections'] = [];

    switch (type) {
      case 'alerts': {
        const { data: alerts } = await supabase
          .from('alerts')
          .select('*')
          .gte('timestamp', range.start.toISOString())
          .lte('timestamp', range.end.toISOString())
          .order('timestamp', { ascending: false });

        const alertsList = alerts || [];

        // Summary
        const bySeverity = {
          critical: alertsList.filter((a) => a.severity === 'critical').length,
          high: alertsList.filter((a) => a.severity === 'high').length,
          medium: alertsList.filter((a) => a.severity === 'medium').length,
          low: alertsList.filter((a) => a.severity === 'low').length,
        };

        sections.push({
          title: 'Resumo',
          type: 'summary',
          data: [
            { label: 'Total de Alertas', value: alertsList.length },
            { label: 'Críticos', value: bySeverity.critical },
            { label: 'Alta Prioridade', value: bySeverity.high },
            { label: 'Média Prioridade', value: bySeverity.medium },
          ],
        });

        // Table
        sections.push({
          title: 'Histórico de Alertas',
          type: 'table',
          data: {
            headers: ['Data/Hora', 'Câmera', 'Tipo', 'Severidade', 'Mensagem'],
            rows: alertsList.slice(0, 50).map((a) => [
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
          subtitle: `Análise completa de ${alertsList.length} alertas no período`,
          dateRange: range,
          generatedAt: new Date(),
          sections,
        };
      }

      case 'recognition': {
        const { data: logs } = await supabase
          .from('recognition_logs')
          .select('*, registered_persons(name)')
          .gte('timestamp', range.start.toISOString())
          .lte('timestamp', range.end.toISOString())
          .order('timestamp', { ascending: false });

        const logsList = logs || [];
        const recognized = logsList.filter((l) => l.recognized).length;
        const unknown = logsList.filter((l) => !l.recognized).length;
        const avgConfidence =
          logsList.length > 0
            ? logsList.reduce((acc, l) => acc + (l.confidence || 0), 0) / logsList.length
            : 0;

        sections.push({
          title: 'Resumo',
          type: 'summary',
          data: [
            { label: 'Total Detecções', value: logsList.length },
            { label: 'Reconhecidos', value: recognized },
            { label: 'Desconhecidos', value: unknown },
            { label: 'Confiança Média', value: `${(avgConfidence * 100).toFixed(1)}%` },
          ],
        });

        sections.push({
          title: 'Logs de Reconhecimento',
          type: 'table',
          data: {
            headers: ['Data/Hora', 'Pessoa', 'Status', 'Confiança'],
            rows: logsList.slice(0, 50).map((l) => [
              format(new Date(l.timestamp), 'dd/MM/yy HH:mm', { locale: ptBR }),
              (l.registered_persons as any)?.name || 'Desconhecido',
              l.recognized ? 'Reconhecido' : 'Não reconhecido',
              `${((l.confidence || 0) * 100).toFixed(1)}%`,
            ]),
          },
        });

        return {
          title: 'Relatório de Reconhecimento Facial',
          subtitle: `${logsList.length} detecções registradas`,
          dateRange: range,
          generatedAt: new Date(),
          sections,
        };
      }

      case 'cameras': {
        const { data: cameras } = await supabase.from('cameras').select('*');
        const camerasList = cameras || [];

        const online = camerasList.filter((c) => c.status === 'online').length;
        const offline = camerasList.filter((c) => c.status === 'offline').length;
        const alert = camerasList.filter((c) => c.status === 'alert').length;

        sections.push({
          title: 'Resumo',
          type: 'summary',
          data: [
            { label: 'Total Câmeras', value: camerasList.length },
            { label: 'Online', value: online },
            { label: 'Offline', value: offline },
            { label: 'Em Alerta', value: alert },
          ],
        });

        sections.push({
          title: 'Status das Câmeras',
          type: 'table',
          data: {
            headers: ['Nome', 'Localização', 'Status', 'Pessoas', 'Alertas'],
            rows: camerasList.map((c) => [
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
          subtitle: `Status de ${camerasList.length} câmeras do sistema`,
          dateRange: range,
          generatedAt: new Date(),
          sections,
        };
      }

      case 'analytics': {
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

        const alertsList = alerts || [];
        const logsList = logs || [];
        const camerasList = cameras || [];
        const zonesList = zones || [];

        sections.push({
          title: 'Visão Geral',
          type: 'summary',
          data: [
            { label: 'Alertas', value: alertsList.length },
            { label: 'Detecções', value: logsList.length },
            { label: 'Câmeras', value: camerasList.length },
            { label: 'Zonas', value: zonesList.length },
          ],
        });

        sections.push({
          title: 'Análise',
          type: 'text',
          data: `Este relatório consolidado apresenta uma visão geral do sistema de vigilância no período selecionado. Foram registrados ${alertsList.length} alertas e ${logsList.length} detecções de reconhecimento facial. O sistema conta com ${camerasList.length} câmeras configuradas e ${zonesList.length} zonas de monitoramento ativas.`,
        });

        return {
          title: 'Relatório Analítico Consolidado',
          subtitle: 'Métricas e indicadores do sistema',
          dateRange: range,
          generatedAt: new Date(),
          sections,
        };
      }

      default:
        return {
          title: 'Relatório',
          dateRange: range,
          generatedAt: new Date(),
          sections: [],
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
        {/* Configuração */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tipo de Relatório */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipo de Relatório</CardTitle>
              <CardDescription>Selecione o tipo de relatório a ser gerado</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedReport === type.id;

                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReport(type.id)}
                      className={cn(
                        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{type.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                      {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Período */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-4">
                {[
                  { label: 'Hoje', days: 0 },
                  { label: 'Últimos 7 dias', days: 7 },
                  { label: 'Últimos 30 dias', days: 30 },
                  { label: 'Últimos 90 dias', days: 90 },
                ].map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setDateRange({
                        start: startOfDay(subDays(new Date(), preset.days)),
                        end: endOfDay(new Date()),
                      })
                    }
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(dateRange.start, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.start}
                      onSelect={(date) => date && setDateRange((prev) => ({ ...prev, start: date }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">até</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="justify-start gap-2">
                      <Calendar className="w-4 h-4" />
                      {format(dateRange.end, 'dd/MM/yyyy', { locale: ptBR })}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dateRange.end}
                      onSelect={(date) => date && setDateRange((prev) => ({ ...prev, end: date }))}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>

          {/* Gerar */}
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

        {/* Histórico */}
        <div>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Histórico Recente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {generatedReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum relatório gerado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <FileText className="w-5 h-5 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.type}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(report.date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default ReportsPanel;
