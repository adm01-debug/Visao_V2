import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJourneyData, type PeriodFilter } from '@/components/journey/useJourneyData';
import { JourneyTable } from '@/components/journey/JourneyTable';
import { ZoneBreakdown } from '@/components/journey/ZoneBreakdown';
import { FileText, RefreshCw, Download, MessageSquare, Users, TrendingUp, Clock, MapPin } from 'lucide-react';
import { PageMeta } from '@/components/PageMeta';

export default function JourneyReportsPage() {
  const { period, setPeriod, selectedPerson, setSelectedPerson, persons, journeyData, isLoading, refetch, stats, formatMinutes, exportPDF, sendViaTelegram, sending } = useJourneyData();

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <PageMeta title="Relatórios de Jornada" description="Relatórios automatizados de jornada de colaboradores" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Relatórios de Jornada</h1>
            <p className="text-sm text-muted-foreground">Entrada, saída, tempo por zona e produtividade</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Atualizar</Button>
          <Button variant="outline" size="sm" onClick={exportPDF}><Download className="h-3.5 w-3.5 mr-1.5" />Exportar PDF</Button>
          <Button variant="outline" size="sm" onClick={sendViaTelegram} disabled={sending}><MessageSquare className="h-3.5 w-3.5 mr-1.5" />{sending ? 'Enviando...' : 'Telegram'}</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Período" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="yesterday">Ontem</SelectItem>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedPerson} onValueChange={setSelectedPerson}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Colaborador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Colaboradores</SelectItem>
            {persons.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground ml-auto">{journeyData.length} registros</span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{journeyData.length}</p><p className="text-[11px] text-muted-foreground">Colaboradores</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><TrendingUp className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{formatMinutes(stats.avgProd)}</p><p className="text-[11px] text-muted-foreground">Média Produtiva</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><Clock className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{stats.onTimeRate}%</p><p className="text-[11px] text-muted-foreground">Pontualidade</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div><div><p className="text-2xl font-bold">{formatMinutes(stats.totalIdle)}</p><p className="text-[11px] text-muted-foreground">Total Ocioso</p></div></CardContent></Card>
      </div>

      <JourneyTable data={journeyData} isLoading={isLoading} formatMinutes={formatMinutes} />
      <ZoneBreakdown data={journeyData} formatMinutes={formatMinutes} />
    </div>
  );
}
