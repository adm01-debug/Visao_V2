import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { exportToCSV, exportToPDF } from '@/lib/exportUtils';

export function useRecognitionData() {
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['recognition-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recognition_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: persons } = useQuery({
    queryKey: ['registered-persons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('registered_persons')
        .select('id, name, photo_url')
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: cameras } = useQuery({
    queryKey: ['cameras'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cameras').select('id, name').order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  const getPersonInfo = (personId: string | null) => {
    if (!personId) return null;
    return persons?.find((p) => p.id === personId) ?? null;
  };

  const getCameraName = (cameraId: string | null) => {
    if (!cameraId) return 'Desconhecida';
    return cameras?.find((c) => c.id === cameraId)?.name ?? 'Desconhecida';
  };

  return {
    logs: logs ?? [],
    logsLoading,
    persons: persons ?? [],
    cameras: cameras ?? [],
    getPersonInfo,
    getCameraName,
  };
}

export interface RecognitionFilters {
  searchTerm: string;
  selectedPerson: string;
  selectedCamera: string;
  selectedStatus: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

export function useFilteredLogs(
  logs: ReturnType<typeof useRecognitionData>['logs'],
  persons: ReturnType<typeof useRecognitionData>['persons'],
  cameras: ReturnType<typeof useRecognitionData>['cameras'],
  filters: RecognitionFilters
) {
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filters.searchTerm) {
        const personName = persons.find((p) => p.id === log.person_id)?.name?.toLowerCase() ?? '';
        const cameraName = cameras.find((c) => c.id === log.camera_id)?.name?.toLowerCase() ?? '';
        const search = filters.searchTerm.toLowerCase();
        if (!personName.includes(search) && !cameraName.includes(search)) return false;
      }
      if (filters.selectedPerson !== 'all' && log.person_id !== filters.selectedPerson)
        return false;
      if (filters.selectedCamera !== 'all' && log.camera_id !== filters.selectedCamera)
        return false;
      if (filters.selectedStatus !== 'all') {
        if (filters.selectedStatus === 'recognized' && !log.recognized) return false;
        if (filters.selectedStatus === 'unknown' && log.recognized) return false;
      }
      const logDate = new Date(log.timestamp);
      if (filters.dateFrom && logDate < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (logDate > endOfDay) return false;
      }
      return true;
    });
  }, [logs, persons, cameras, filters]);

  const stats = useMemo(() => {
    if (!filteredLogs.length) return { total: 0, recognized: 0, unknown: 0, avgConfidence: 0 };
    const recognized = filteredLogs.filter((l) => l.recognized).length;
    const withConfidence = filteredLogs.filter((l) => l.confidence);
    const avgConfidence = withConfidence.length
      ? (withConfidence.reduce((sum, l) => sum + Number(l.confidence), 0) / withConfidence.length) *
        100
      : 0;
    return {
      total: filteredLogs.length,
      recognized,
      unknown: filteredLogs.length - recognized,
      avgConfidence,
    };
  }, [filteredLogs]);

  return { filteredLogs, stats };
}

export function useRecognitionExport(
  filteredLogs: ReturnType<typeof useRecognitionData>['logs'],
  getPersonInfo: ReturnType<typeof useRecognitionData>['getPersonInfo'],
  getCameraName: ReturnType<typeof useRecognitionData>['getCameraName']
) {
  const mapData = () =>
    filteredLogs.map((log) => ({
      'Data/Hora': format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
      Pessoa: getPersonInfo(log.person_id)?.name ?? 'Desconhecido',
      Câmera: getCameraName(log.camera_id),
      Reconhecido: log.recognized ? 'Sim' : 'Não',
      Confiança: log.confidence ? `${(Number(log.confidence) * 100).toFixed(1)}%` : '-',
    }));

  const handleExportCSV = () => exportToCSV(mapData(), 'logs-reconhecimento');
  const handleExportPDF = () =>
    exportToPDF(mapData(), 'logs-reconhecimento', 'Logs de Reconhecimento Facial');

  return { handleExportCSV, handleExportPDF };
}
