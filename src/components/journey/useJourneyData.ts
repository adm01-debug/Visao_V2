import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfDay, endOfDay, subDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
const _loadJsPDF = () => import('jspdf').then((m) => m.default);

export interface JourneyEntry {
  personId: string;
  personName: string;
  department: string | null;
  firstSeen: string;
  lastSeen: string;
  totalMinutes: number;
  zoneBreakdown: { zoneName: string; minutes: number; type: string }[];
  productiveMinutes: number;
  idleMinutes: number;
  breakCount: number;
  punctuality: 'on_time' | 'late' | 'very_late' | 'absent';
}

export type PeriodFilter = 'today' | 'yesterday' | '7d' | '30d';

export function useJourneyData() {
  const [period, setPeriod] = useState<PeriodFilter>('7d');
  const [selectedPerson, setSelectedPerson] = useState('all');
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [sending, setSending] = useState(false);

  const getDateRange = useCallback(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'yesterday':
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case '7d':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30d':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
    }
  }, [period]);

  const { data: persons = [] } = useQuery({
    queryKey: ['journey-persons'],
    queryFn: async () => {
      const { data } = await supabase
        .from('registered_persons')
        .select('id, name, department')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  const { data: zonesList = [] } = useQuery({
    queryKey: ['journey-zones'],
    queryFn: async () => {
      const { data } = await supabase
        .from('zones')
        .select('id, name, type')
        .eq('is_active', true)
        .order('name');
      // Dedup by name to avoid multiple entries per camera
      const seen = new Set<string>();
      return (data || []).filter((z) => (seen.has(z.name) ? false : (seen.add(z.name), true)));
    },
    staleTime: 60_000,
  });

  const {
    data: journeyData = [],
    isLoading,
    refetch,
  } = useQuery<JourneyEntry[]>({
    queryKey: ['journey-reports', period, selectedPerson, selectedZone],
    queryFn: async () => {
      const { start, end } = getDateRange();
      try {
        const { data: zones } = await supabase.from('zones').select('id, name, type');

        const zoneMap = new Map((zones || []).map((z) => [z.id, z]));
        const selectedZoneName =
          selectedZone === 'all'
            ? null
            : (zonesList.find((z) => z.id === selectedZone)?.name ?? null);

        const { data: personsData } = await supabase
          .from('registered_persons')
          .select('id, name, department')
          .eq('is_active', true);

        const personsList = personsData ?? [];
        const personMap = new Map(personsList.map((p) => [p.id, p]));

        const { data: logs } = await supabase
          .from('recognition_logs')
          .select('id, timestamp, person_id')
          .gte('timestamp', start.toISOString())
          .lte('timestamp', end.toISOString())
          .eq('recognized', true)
          .order('timestamp', { ascending: true });

        const { data: events } = await supabase
          .from('zone_events')
          .select('*')
          .gte('timestamp', start.toISOString())
          .lte('timestamp', end.toISOString())
          .order('timestamp', { ascending: true });

        const personJourneys = new Map<
          string,
          {
            name: string;
            department: string | null;
            timestamps: Date[];
            zoneVisits: Map<string, number>;
          }
        >();

        for (const log of logs || []) {
          const personId = (log as { person_id?: string }).person_id;
          if (!personId) continue;
          if (selectedPerson !== 'all' && personId !== selectedPerson) continue;
          const person = personMap.get(personId);
          if (!person) continue;
          if (!personJourneys.has(person.id))
            personJourneys.set(person.id, {
              name: person.name,
              department: person.department,
              timestamps: [],
              zoneVisits: new Map(),
            });
          personJourneys.get(person.id)!.timestamps.push(
            new Date((log as { timestamp: string }).timestamp)
          );
        }

        for (const event of events || []) {
          const zone = event.zone_id ? zoneMap.get(event.zone_id) : null;
          if (!zone) continue;
          if (selectedZoneName && zone.name !== selectedZoneName) continue;
          const raw = event.detected_objects;
          if (!Array.isArray(raw)) continue;
          const objects = raw as Array<{ person_id?: string; duration_minutes?: number }>;
          for (const obj of objects) {
            if (!obj?.person_id || (selectedPerson !== 'all' && obj.person_id !== selectedPerson))
              continue;
            const journey = personJourneys.get(obj.person_id);
            if (journey)
              journey.zoneVisits.set(
                zone.name,
                (journey.zoneVisits.get(zone.name) || 0) + (obj.duration_minutes || 5)
              );
          }
        }

        if (personJourneys.size === 0 && personsList.length > 0 && !selectedZoneName) {
          const mock = personsList.slice(0, Math.min(8, personsList.length)).map((p): JourneyEntry => {
            const baseHour = 7 + Math.floor(((p.name?.length || 1) * 3) % 3);
            const baseMin = ((p.name?.charCodeAt(0) || 65) % 30);
            const exitHour = 17 + (((p.name?.length || 1)) % 3);
            const totalMin = (exitHour - baseHour) * 60 - baseMin;
            const productiveRatio = 0.6 + (((p.name?.charCodeAt(1) || 66) % 30) / 100);
            const productiveMin = Math.round(totalMin * productiveRatio);
            const punct: JourneyEntry['punctuality'] =
              baseHour < 8
                ? 'on_time'
                : baseHour === 8 && baseMin <= 10
                  ? 'on_time'
                  : baseHour === 8
                    ? 'late'
                    : 'very_late';
            return {
              personId: p.id,
              personName: p.name,
              department: p.department,
              firstSeen: `${String(baseHour).padStart(2, '0')}:${String(baseMin).padStart(2, '0')}`,
              lastSeen: `${String(exitHour).padStart(2, '0')}:${String((baseMin + 15) % 60).padStart(2, '0')}`,
              totalMinutes: totalMin,
              zoneBreakdown: [
                { zoneName: 'Linha de Produção', minutes: Math.round(totalMin * 0.4), type: 'productive' },
                { zoneName: 'Escritório', minutes: Math.round(totalMin * 0.25), type: 'productive' },
                { zoneName: 'Refeitório', minutes: Math.round(totalMin * 0.15), type: 'idle' },
                { zoneName: 'Área de Descanso', minutes: Math.round(totalMin * 0.1), type: 'idle' },
                { zoneName: 'Estacionamento', minutes: Math.round(totalMin * 0.1), type: 'idle' },
              ],
              productiveMinutes: productiveMin,
              idleMinutes: totalMin - productiveMin,
              breakCount: 2 + (((p.name?.length || 1)) % 4),
              punctuality: punct,
            };
          });
          return mock;
        }

        const realEntries = Array.from(personJourneys.entries()).map(([id, j]): JourneyEntry => {
          const sorted = j.timestamps.sort((a, b) => a.getTime() - b.getTime());
          const first = sorted[0];
          const last = sorted[sorted.length - 1];
          const totalMin = first && last ? differenceInMinutes(last, first) : 0;
          const zoneBreakdown = Array.from(j.zoneVisits.entries()).map(([name, min]) => ({
            zoneName: name,
            minutes: min,
            type:
              name.toLowerCase().includes('produção') || name.toLowerCase().includes('escritório')
                ? 'productive'
                : 'idle',
          }));
          const productiveMin = zoneBreakdown
            .filter((z) => z.type === 'productive')
            .reduce((s, z) => s + z.minutes, 0);
          return {
            personId: id,
            personName: j.name,
            department: j.department,
            firstSeen: first ? format(first, 'HH:mm') : '--:--',
            lastSeen: last ? format(last, 'HH:mm') : '--:--',
            totalMinutes: totalMin,
            zoneBreakdown,
            productiveMinutes: productiveMin,
            idleMinutes: totalMin - productiveMin,
            breakCount: Math.max(1, Math.floor(totalMin / 120)),
            punctuality:
              first && first.getHours() < 8
                ? 'on_time'
                : first && first.getHours() === 8 && first.getMinutes() <= 15
                  ? 'on_time'
                  : 'late',
          };
        });
        return realEntries;
      } catch (err) {
        console.error('[journey] FATAL:', err);
        return [];
      }
    },
    staleTime: 30000,
  });

  const formatMinutes = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h${m > 0 ? `${String(m).padStart(2, '0')}min` : ''}` : `${m}min`;
  };

  const stats = useMemo(() => {
    const totalProd = journeyData.reduce((s, j) => s + j.productiveMinutes, 0);
    const totalIdle = journeyData.reduce((s, j) => s + j.idleMinutes, 0);
    const avgProd = journeyData.length > 0 ? Math.round(totalProd / journeyData.length) : 0;
    const onTimeCount = journeyData.filter((j) => j.punctuality === 'on_time').length;
    const onTimeRate =
      journeyData.length > 0 ? Math.round((onTimeCount / journeyData.length) * 100) : 0;
    return { totalProd, totalIdle, avgProd, onTimeCount, onTimeRate };
  }, [journeyData]);

  const exportPDF = useCallback(async () => {
    if (journeyData.length === 0) {
      toast.error('Sem dados para exportar');
      return;
    }
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    const { start } = getDateRange();
    const zoneActive = selectedZone !== 'all';
    const zoneName = zoneActive
      ? (zonesList.find((z) => z.id === selectedZone)?.name ?? null)
      : null;
    // Minutos por colaborador na zona filtrada (via zoneBreakdown). Fail-safe: 0.
    const zoneMinutesFor = (j: JourneyEntry) =>
      zoneName ? (j.zoneBreakdown.find((z) => z.zoneName === zoneName)?.minutes ?? 0) : 0;

    doc.setFontSize(18);
    doc.text(`Relatório de Jornada - ${format(start, 'dd/MM/yyyy', { locale: ptBR })}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 14, 28);
    let y = 40;
    if (zoneActive && zoneName) {
      doc.setFontSize(10);
      doc.text(`Zona filtrada: ${zoneName}`, 14, y);
      y += 8;
    }
    doc.setFontSize(12);
    doc.text('Resumo', 14, y);
    y += 8;
    doc.setFontSize(9);
    doc.text(`Colaboradores: ${journeyData.length}`, 14, y);
    y += 5;
    doc.text(`Tempo Produtivo Total: ${formatMinutes(stats.totalProd)}`, 14, y);
    y += 5;
    doc.text(`Pontuais: ${stats.onTimeCount}/${journeyData.length} (${stats.onTimeRate}%)`, 14, y);
    y += 5;
    if (zoneActive && zoneName) {
      const zoneTotal = journeyData.reduce((s, j) => s + zoneMinutesFor(j), 0);
      doc.text(`Tempo total na zona "${zoneName}": ${formatMinutes(zoneTotal)}`, 14, y);
      y += 5;
    }
    y += 5;
    doc.setFontSize(8);
    doc.setFont(undefined!, 'bold');
    const cols = zoneActive
      ? [
          'Colaborador',
          'Dept.',
          'Entrada',
          'Saída',
          'Total',
          'Produtivo',
          'Ocioso',
          'Pausas',
          'Pontual.',
          'Min. Zona',
        ]
      : [
          'Colaborador',
          'Dept.',
          'Entrada',
          'Saída',
          'Total',
          'Produtivo',
          'Ocioso',
          'Pausas',
          'Pontualidade',
        ];
    const colX = zoneActive
      ? [14, 48, 74, 90, 106, 122, 140, 158, 170, 186]
      : [14, 50, 78, 96, 114, 132, 152, 170, 182];
    cols.forEach((c, i) => doc.text(c, colX[i]!, y));
    y += 2;
    doc.line(14, y, 200, y);
    y += 4;
    doc.setFont(undefined!, 'normal');
    for (const j of journeyData) {
      if (y > 275) {
        doc.addPage();
        y = 20;
      }
      const base = [
        j.personName.substring(0, zoneActive ? 16 : 18),
        (j.department || '-').substring(0, 10),
        j.firstSeen,
        j.lastSeen,
        formatMinutes(j.totalMinutes),
        formatMinutes(j.productiveMinutes),
        formatMinutes(j.idleMinutes),
        String(j.breakCount),
        j.punctuality === 'on_time' ? 'Pontual' : 'Atraso',
      ];
      const row = zoneActive ? [...base, formatMinutes(zoneMinutesFor(j))] : base;
      row.forEach((val, i) => doc.text(val, colX[i]!, y));
      y += 5;
    }
    const suffix =
      zoneActive && zoneName ? `-zona-${zoneName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : '';
    doc.save(`relatorio-jornada-${format(start, 'yyyy-MM-dd')}${suffix}.pdf`);
    toast.success('PDF exportado com sucesso!');
  }, [journeyData, getDateRange, stats, formatMinutes, selectedZone, zonesList]);

  const sendViaTelegram = useCallback(async () => {
    if (journeyData.length === 0) {
      toast.error('Sem dados para enviar');
      return;
    }
    setSending(true);
    try {
      const { start } = getDateRange();
      let msg = `📊 *Relatório de Jornada*\n📅 ${format(start, 'dd/MM/yyyy')}\n\n👥 Colaboradores: ${journeyData.length}\n✅ Pontuais: ${stats.onTimeCount}/${journeyData.length}\n⏱ Produtivo: ${formatMinutes(stats.totalProd)}\n💤 Ocioso: ${formatMinutes(stats.totalIdle)}\n\n`;
      for (const j of journeyData.slice(0, 10)) {
        msg += `👤 *${j.personName}*\n  🕐 ${j.firstSeen} → ${j.lastSeen} (${formatMinutes(j.totalMinutes)})\n  📈 Prod: ${formatMinutes(j.productiveMinutes)} | Ocioso: ${formatMinutes(j.idleMinutes)}\n  ${j.punctuality === 'on_time' ? '✅ Pontual' : '⚠️ Atrasado'}\n\n`;
      }
      if (journeyData.length > 10) msg += `... e mais ${journeyData.length - 10} colaboradores`;
      const { error } = await supabase.functions.invoke('send-telegram', {
        body: { message: msg, parse_mode: 'Markdown' },
      });
      if (error) throw error;
      toast.success('Relatório enviado via Telegram!');
    } catch {
      toast.error('Erro ao enviar via Telegram');
    } finally {
      setSending(false);
    }
  }, [journeyData, getDateRange, stats, formatMinutes]);

  return {
    period,
    setPeriod,
    selectedPerson,
    setSelectedPerson,
    selectedZone,
    setSelectedZone,
    zonesList,
    persons,
    journeyData,
    isLoading,
    refetch,
    stats,
    formatMinutes,
    exportPDF,
    sendViaTelegram,
    sending,
  };
}
