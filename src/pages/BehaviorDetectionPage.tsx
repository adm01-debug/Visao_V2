import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Brain, MessageCircle, Smartphone, UserX, AlertTriangle, Upload, TrendingDown, Loader2 } from 'lucide-react';
import { useBehaviorAnalysis } from '@/components/behavior/useBehaviorAnalysis';
import { BehaviorCharts } from '@/components/behavior/BehaviorCharts';
import { BehaviorResultCard } from '@/components/behavior/BehaviorResultCard';
import { PageMeta } from '@/components/PageMeta';

export default function BehaviorDetectionPage() {
  const { selectedCamera, setSelectedCamera, isAnalyzing, analysisResults, cameras, camerasLoading, analyzeCamera, analyzeFromFile, stats, patternDistribution, severityDistribution } = useBehaviorAnalysis();

  return (
    <MainLayout>
      <PageMeta title="Detecção de Comportamento" description="Análise comportamental com IA" />

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><Brain className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Detecção de Padrões Comportamentais</h1>
              <p className="text-sm text-muted-foreground">Análise automática via IA de conversas, celular e ausências</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Câmera" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Câmeras</SelectItem>
                {cameras.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={analyzeFromFile} disabled={isAnalyzing}><Upload className="h-3.5 w-3.5 mr-1.5" />Upload</Button>
            <Button size="sm" disabled={isAnalyzing || cameras.length === 0} onClick={() => {
              const cam = selectedCamera === 'all' ? cameras[Math.floor(Math.random() * cameras.length)] : cameras.find(c => c.id === selectedCamera);
              if (cam) analyzeCamera(cam.id, cam.name, cam.thumbnail || undefined);
            }}>
              {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1.5" />}
              Analisar Agora
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><MessageCircle className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Conversas</span></div><p className="text-3xl font-bold text-foreground">{stats?.conversations || 0}</p><p className="text-[10px] text-muted-foreground">excessivas detectadas</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><Smartphone className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Celular</span></div><p className="text-3xl font-bold text-foreground">{stats?.phones || 0}</p><p className="text-[10px] text-muted-foreground">usos detectados</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><UserX className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Ausências</span></div><p className="text-3xl font-bold text-foreground">{stats?.absences || 0}</p><p className="text-[10px] text-muted-foreground">prolongadas</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><AlertTriangle className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Total Padrões</span></div><p className="text-3xl font-bold text-foreground">{stats?.totalPatterns || 0}</p><p className="text-[10px] text-muted-foreground">comportamentais</p></CardContent></Card>
          <Card><CardContent className="p-4"><div className="flex items-center gap-2 mb-2"><TrendingDown className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Score Produtividade</span></div><p className="text-3xl font-bold text-foreground">{stats?.avgScore || '--'}%</p><Progress value={stats?.avgScore || 0} className="mt-2 h-1.5" /></CardContent></Card>
        </div>

        {/* Charts */}
        {analysisResults.length > 0 && <BehaviorCharts patternDistribution={patternDistribution} severityDistribution={severityDistribution} />}

        {/* Results */}
        {camerasLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
        ) : analysisResults.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium text-foreground">Nenhuma análise realizada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">Selecione uma câmera e clique em "Analisar Agora" ou faça upload de uma imagem.</p>
              <Button className="mt-4" size="sm" onClick={() => {
                if (cameras.length > 0) { const cam = cameras[0]; analyzeCamera(cam!.id, cam!.name, cam!.thumbnail || undefined); }
              }} disabled={isAnalyzing || cameras.length === 0}>
                <Brain className="h-3.5 w-3.5 mr-1.5" />Iniciar Primeira Análise
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">{analysisResults.map(record => <BehaviorResultCard key={record.id} record={record} />)}</div>
        )}
      </div>
    </MainLayout>
  );
}
