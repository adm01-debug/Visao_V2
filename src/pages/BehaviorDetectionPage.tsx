import { useState, useMemo, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Brain, MessageCircle, Smartphone, UserX, AlertTriangle,
  Camera, Upload, RefreshCw, Eye, Clock, Users,
  TrendingDown, ShieldAlert, Loader2
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Helmet } from "react-helmet-async";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

interface BehavioralPattern {
  pattern_type: string;
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  people_involved: number;
  estimated_duration_minutes: number;
  location: string;
  description: string;
  recommendation: string;
}

interface BehaviorAlert {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  action_required: boolean;
}

interface BehaviorAnalysis {
  people_count: number;
  behavioral_patterns: BehavioralPattern[];
  productivity_score: number;
  zone_analysis: {
    productive_zones_occupied: number;
    idle_zones_occupied: number;
    empty_workstations: number;
  };
  alerts: BehaviorAlert[];
  summary: string;
  recommendations: string[];
}

interface AnalysisRecord {
  id: string;
  cameraName: string;
  cameraId: string;
  analysis: BehaviorAnalysis;
  timestamp: string;
  imageUrl?: string;
}

const PATTERN_CONFIG: Record<string, { icon: typeof MessageCircle; label: string; color: string }> = {
  excessive_conversation: { icon: MessageCircle, label: "Conversa Excessiva", color: "text-warning" },
  cell_phone_usage: { icon: Smartphone, label: "Uso de Celular", color: "text-destructive" },
  prolonged_absence: { icon: UserX, label: "Ausência Prolongada", color: "text-destructive" },
  distraction: { icon: Eye, label: "Distração", color: "text-warning" },
  drowsiness: { icon: Clock, label: "Sonolência", color: "text-destructive" },
  unauthorized_break: { icon: Clock, label: "Pausa Não Autorizada", color: "text-warning" },
  crowding: { icon: Users, label: "Aglomeração", color: "text-warning" },
};

export default function BehaviorDetectionPage() {
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisRecord[]>([]);

  const { data: cameras = [], isLoading: camerasLoading } = useQuery({
    queryKey: ["cameras-behavior"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cameras")
        .select("id, name, status, thumbnail, stream_url")
        .order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const analyzeCamera = useCallback(async (cameraId: string, cameraName: string, imageUrl?: string) => {
    setIsAnalyzing(true);
    try {
      const body: Record<string, string> = { cameraId, cameraName };
      if (imageUrl) {
        body.imageUrl = imageUrl;
      } else {
        // Use a demo analysis for cameras without thumbnails
        body.imageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800";
      }

      const { data, error } = await supabase.functions.invoke("detect-behavior", { body });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || "Analysis failed");

      const record: AnalysisRecord = {
        id: crypto.randomUUID(),
        cameraName,
        cameraId,
        analysis: data.analysis,
        timestamp: data.timestamp,
        imageUrl: body.imageUrl,
      };

      setAnalysisResults(prev => [record, ...prev].slice(0, 50));

      const patternCount = data.analysis.behavioral_patterns?.length || 0;
      toast.success(`Análise concluída: ${patternCount} padrão(ões) detectado(s)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast.error(`Erro na análise: ${msg}`);
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const analyzeFromFile = useCallback(async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsAnalyzing(true);
      try {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const base64 = (ev.target?.result as string)?.split(",")[1];
          if (!base64) return;

          const { data, error } = await supabase.functions.invoke("detect-behavior", {
            body: { imageBase64: base64, cameraId: "upload", cameraName: "Upload Manual" },
          });

          if (error) throw error;
          if (!data.success) throw new Error(data.error);

          setAnalysisResults(prev => [{
            id: crypto.randomUUID(),
            cameraName: "Upload Manual",
            cameraId: "upload",
            analysis: data.analysis,
            timestamp: data.timestamp,
          }, ...prev].slice(0, 50));

          toast.success("Análise de upload concluída");
          setIsAnalyzing(false);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        toast.error("Erro ao analisar imagem");
        setIsAnalyzing(false);
      }
    };
    input.click();
  }, []);

  // Aggregated stats from all results
  const stats = useMemo(() => {
    if (analysisResults.length === 0) return null;

    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    const conversations = allPatterns.filter(p => p.pattern_type === "excessive_conversation").length;
    const phones = allPatterns.filter(p => p.pattern_type === "cell_phone_usage").length;
    const absences = allPatterns.filter(p => p.pattern_type === "prolonged_absence").length;
    const avgScore = Math.round(analysisResults.reduce((s, r) => s + (r.analysis.productivity_score || 0), 0) / analysisResults.length);

    return { conversations, phones, absences, avgScore, totalPatterns: allPatterns.length };
  }, [analysisResults]);

  // Chart data
  const patternDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    const counts = new Map<string, number>();
    allPatterns.forEach(p => counts.set(p.pattern_type, (counts.get(p.pattern_type) || 0) + 1));
    const colors = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(38, 92%, 50%)", "hsl(280, 84%, 60%)", "hsl(160, 84%, 40%)", "hsl(200, 84%, 50%)"];
    return Array.from(counts.entries()).map(([type, count], i) => ({
      name: PATTERN_CONFIG[type]?.label || type,
      value: count,
      color: colors[i % colors.length],
    }));
  }, [analysisResults]);

  const severityDistribution = useMemo(() => {
    const allPatterns = analysisResults.flatMap(r => r.analysis.behavioral_patterns || []);
    const map = { low: 0, medium: 0, high: 0, critical: 0 };
    allPatterns.forEach(p => { if (p.severity in map) map[p.severity as keyof typeof map]++; });
    return [
      { name: "Baixo", value: map.low, fill: "hsl(var(--success))" },
      { name: "Médio", value: map.medium, fill: "hsl(38, 92%, 50%)" },
      { name: "Alto", value: map.high, fill: "hsl(var(--destructive))" },
      { name: "Crítico", value: map.critical, fill: "hsl(0, 84%, 40%)" },
    ].filter(d => d.value > 0);
  }, [analysisResults]);

  const getSeverityBadge = (severity: string) => {
    const map: Record<string, { cls: string; label: string }> = {
      low: { cls: "bg-success/20 text-success border-success/30", label: "Baixo" },
      medium: { cls: "bg-warning/20 text-warning border-warning/30", label: "Médio" },
      high: { cls: "bg-destructive/20 text-destructive border-destructive/30", label: "Alto" },
      critical: { cls: "bg-destructive/30 text-destructive border-destructive/50", label: "Crítico" },
    };
    const cfg = map[severity] || map.low;
    return <Badge className={`${cfg.cls} text-[10px]`}>{cfg.label}</Badge>;
  };

  return (
    <MainLayout>
      <Helmet>
        <title>Detecção Comportamental | VisionAI</title>
        <meta name="description" content="Detecção de padrões comportamentais com IA para identificar conversas excessivas, uso de celular e ausências." />
      </Helmet>

      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Detecção de Padrões Comportamentais</h1>
              <p className="text-sm text-muted-foreground">Análise automática via IA de conversas, celular e ausências</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Câmera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Câmeras</SelectItem>
                {cameras.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={analyzeFromFile} disabled={isAnalyzing}>
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Upload
            </Button>
            <Button
              size="sm"
              disabled={isAnalyzing || cameras.length === 0}
              onClick={() => {
                const cam = selectedCamera === "all"
                  ? cameras[Math.floor(Math.random() * cameras.length)]
                  : cameras.find(c => c.id === selectedCamera);
                if (cam) analyzeCamera(cam.id, cam.name, cam.thumbnail || undefined);
              }}
            >
              {isAnalyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Brain className="h-3.5 w-3.5 mr-1.5" />}
              Analisar Agora
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Conversas</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats?.conversations || 0}</p>
              <p className="text-[10px] text-muted-foreground">excessivas detectadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Celular</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats?.phones || 0}</p>
              <p className="text-[10px] text-muted-foreground">usos detectados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Ausências</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats?.absences || 0}</p>
              <p className="text-[10px] text-muted-foreground">prolongadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">Total Padrões</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats?.totalPatterns || 0}</p>
              <p className="text-[10px] text-muted-foreground">comportamentais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">Score Produtividade</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{stats?.avgScore || "--"}%</p>
              <Progress value={stats?.avgScore || 0} className="mt-2 h-1.5" />
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        {analysisResults.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  Distribuição de Padrões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={patternDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {patternDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  Severidade dos Padrões
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={severityDistribution}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {severityDistribution.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analysis Results */}
        {camerasLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : analysisResults.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Brain className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
              <p className="font-medium text-foreground">Nenhuma análise realizada ainda</p>
              <p className="text-sm text-muted-foreground mt-1">
                Selecione uma câmera e clique em "Analisar Agora" ou faça upload de uma imagem.
              </p>
              <Button className="mt-4" size="sm" onClick={() => {
                if (cameras.length > 0) {
                  const cam = cameras[0];
                  analyzeCamera(cam.id, cam.name, cam.thumbnail || undefined);
                }
              }} disabled={isAnalyzing || cameras.length === 0}>
                <Brain className="h-3.5 w-3.5 mr-1.5" />
                Iniciar Primeira Análise
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analysisResults.map((record) => (
              <Card key={record.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Camera className="h-4 w-4 text-primary" />
                      {record.cameraName}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-mono">
                        Score: {record.analysis.productivity_score}%
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(record.timestamp).toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Summary */}
                  <p className="text-sm text-muted-foreground mb-3">{record.analysis.summary}</p>

                  {/* Patterns */}
                  {record.analysis.behavioral_patterns?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-foreground mb-1">Padrões Detectados:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {record.analysis.behavioral_patterns.map((pattern, i) => {
                          const cfg = PATTERN_CONFIG[pattern.pattern_type] || { icon: AlertTriangle, label: pattern.pattern_type, color: "text-muted-foreground" };
                          const PatternIcon = cfg.icon;
                          return (
                            <div key={i} className="p-3 rounded-lg border border-border/50 bg-muted/20">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <PatternIcon className={`h-4 w-4 ${cfg.color}`} />
                                  <span className="text-xs font-medium">{cfg.label}</span>
                                </div>
                                {getSeverityBadge(pattern.severity)}
                              </div>
                              <p className="text-[11px] text-muted-foreground">{pattern.description}</p>
                              <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                                <span>👥 {pattern.people_involved} pessoa(s)</span>
                                <span>⏱️ ~{pattern.estimated_duration_minutes}min</span>
                                <span>📍 {pattern.location}</span>
                                <span>🎯 {Math.round(pattern.confidence * 100)}%</span>
                              </div>
                              {pattern.recommendation && (
                                <p className="text-[10px] text-primary mt-1">💡 {pattern.recommendation}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-success">✓ Nenhum padrão comportamental negativo detectado</p>
                  )}

                  {/* Recommendations */}
                  {record.analysis.recommendations?.length > 0 && (
                    <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                      <p className="text-[10px] font-medium text-primary mb-1">Recomendações:</p>
                      <ul className="text-[10px] text-muted-foreground space-y-0.5">
                        {record.analysis.recommendations.map((r, i) => (
                          <li key={i}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
