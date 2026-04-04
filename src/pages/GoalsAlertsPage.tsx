import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Target, Bell, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  Clock, Users, Zap, RefreshCw, Settings, BarChart3,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, Legend, Cell,
} from "recharts";

// KPI Definitions
interface KPIGoal {
  id: string;
  name: string;
  metric: string;
  target: number;
  unit: string;
  direction: "higher" | "lower"; // higher = above target is good
  alertThreshold: number; // % deviation to trigger alert
  enabled: boolean;
}

interface CollaboratorKPI {
  personId: string;
  personName: string;
  department: string | null;
  kpis: {
    goalId: string;
    goalName: string;
    current: number;
    target: number;
    unit: string;
    direction: "higher" | "lower";
    status: "on_track" | "warning" | "critical";
    deviation: number; // % deviation from target
  }[];
  overallScore: number; // 0-100
}

const DEFAULT_GOALS: KPIGoal[] = [
  { id: "g1", name: "Tempo Produtivo Mínimo", metric: "productive_hours", target: 6, unit: "h", direction: "higher", alertThreshold: 20, enabled: true },
  { id: "g2", name: "Máx. Pausas por Turno", metric: "break_count", target: 4, unit: "pausas", direction: "lower", alertThreshold: 25, enabled: true },
  { id: "g3", name: "Pontualidade", metric: "punctuality_rate", target: 95, unit: "%", direction: "higher", alertThreshold: 10, enabled: true },
  { id: "g4", name: "Tempo Ocioso Máximo", metric: "idle_minutes", target: 60, unit: "min", direction: "lower", alertThreshold: 30, enabled: true },
  { id: "g5", name: "Permanência em Zona Produtiva", metric: "zone_productive_pct", target: 70, unit: "%", direction: "higher", alertThreshold: 15, enabled: true },
  { id: "g6", name: "Detecções Comportamentais", metric: "behavior_incidents", target: 0, unit: "inc.", direction: "lower", alertThreshold: 50, enabled: true },
];

export default function GoalsAlertsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<KPIGoal[]>(DEFAULT_GOALS);
  const [showSettings, setShowSettings] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Fetch persons
  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["goals-persons"],
    queryFn: async () => {
      const { data } = await supabase
        .from("registered_persons")
        .select("id, name, department, role")
        .eq("is_active", true)
        .order("name");
      return data || [];
    },
  });

  const departments = useMemo(() => {
    const depts = new Set(persons.map(p => p.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [persons]);

  // Generate KPI data (demo with realistic patterns)
  const collaboratorKPIs = useMemo((): CollaboratorKPI[] => {
    const filteredPersons = departmentFilter === "all"
      ? persons
      : persons.filter(p => p.department === departmentFilter);

    if (filteredPersons.length === 0) {
      // Demo data
      const demoPersons = [
        { id: "d1", name: "Carlos Silva", department: "Produção" },
        { id: "d2", name: "Ana Santos", department: "Produção" },
        { id: "d3", name: "João Oliveira", department: "Logística" },
        { id: "d4", name: "Maria Costa", department: "Escritório" },
        { id: "d5", name: "Pedro Lima", department: "Produção" },
        { id: "d6", name: "Fernanda Alves", department: "Logística" },
        { id: "d7", name: "Ricardo Souza", department: "Produção" },
        { id: "d8", name: "Juliana Ferreira", department: "Escritório" },
      ];
      return demoPersons.map(p => generateKPIs(p.id, p.name, p.department));
    }

    return filteredPersons.map(p => generateKPIs(p.id, p.name, p.department));
  }, [persons, goals, departmentFilter]);

  function generateKPIs(id: string, name: string, dept: string | null): CollaboratorKPI {
    const kpis = goals.filter(g => g.enabled).map(g => {
      const variance = 0.7 + Math.random() * 0.6; // 70%-130% of target
      let current: number;

      if (g.direction === "higher") {
        current = Math.round(g.target * variance * 10) / 10;
      } else {
        current = Math.round(g.target * (2 - variance) * 10) / 10;
        if (current < 0) current = 0;
      }

      const deviation = g.direction === "higher"
        ? ((g.target - current) / g.target) * 100
        : ((current - g.target) / Math.max(g.target, 1)) * 100;

      let status: "on_track" | "warning" | "critical" = "on_track";
      if (deviation > g.alertThreshold) status = "critical";
      else if (deviation > g.alertThreshold * 0.5) status = "warning";

      return {
        goalId: g.id,
        goalName: g.name,
        current,
        target: g.target,
        unit: g.unit,
        direction: g.direction,
        status,
        deviation: Math.round(deviation),
      };
    });

    const scores = kpis.map(k => k.status === "on_track" ? 100 : k.status === "warning" ? 60 : 20);
    const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    return { personId: id, personName: name, department: dept, kpis, overallScore };
  }

  // Aggregate stats
  const totalAlerts = collaboratorKPIs.reduce((s, c) => s + c.kpis.filter(k => k.status === "critical").length, 0);
  const totalWarnings = collaboratorKPIs.reduce((s, c) => s + c.kpis.filter(k => k.status === "warning").length, 0);
  const avgScore = collaboratorKPIs.length > 0
    ? Math.round(collaboratorKPIs.reduce((s, c) => s + c.overallScore, 0) / collaboratorKPIs.length)
    : 0;
  const onTrackCount = collaboratorKPIs.filter(c => c.overallScore >= 80).length;

  // Chart data
  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "90-100", count: 0, fill: "hsl(var(--chart-1))" },
      { range: "70-89", count: 0, fill: "hsl(var(--chart-2))" },
      { range: "50-69", count: 0, fill: "hsl(var(--chart-3))" },
      { range: "0-49", count: 0, fill: "hsl(var(--chart-4))" },
    ];
    collaboratorKPIs.forEach(c => {
      if (c.overallScore >= 90) { if (buckets[0]) buckets[0].count++; }
      else if (c.overallScore >= 70) { if (buckets[1]) buckets[1].count++; }
      else if (c.overallScore >= 50) { if (buckets[2]) buckets[2].count++; }
      else { if (buckets[3]) buckets[3].count++; }
    });
    return buckets;
  }, [collaboratorKPIs]);

  const goalPerformance = useMemo(() => {
    return goals.filter(g => g.enabled).map(g => {
      const values = collaboratorKPIs.flatMap(c => c.kpis.filter(k => k.goalId === g.id).map(k => k.current));
      const avg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length * 10) / 10 : 0;
      const onTarget = collaboratorKPIs.filter(c => c.kpis.find(k => k.goalId === g.id && k.status === "on_track")).length;
      return { name: g.name.substring(0, 20), avg, target: g.target, onTarget, total: collaboratorKPIs.length };
    });
  }, [goals, collaboratorKPIs]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-yellow-600";
    return "text-destructive";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-destructive";
  };

  const toggleGoal = (id: string) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g));
  };

  const updateGoalTarget = (id: string, value: number) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, target: value } : g));
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Target className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Metas e Alertas Inteligentes</h1>
            <p className="text-sm text-muted-foreground">KPIs visuais e alertas automáticos por colaborador</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              {departments.length === 0 && (
                <>
                  <SelectItem value="Produção">Produção</SelectItem>
                  <SelectItem value="Logística">Logística</SelectItem>
                  <SelectItem value="Escritório">Escritório</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Metas
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div>
              <p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p>
              <p className="text-[11px] text-muted-foreground">Score Médio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{onTrackCount}/{collaboratorKPIs.length}</p>
              <p className="text-[11px] text-muted-foreground">Dentro da Meta</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
            <div>
              <p className="text-2xl font-bold">{totalWarnings}</p>
              <p className="text-[11px] text-muted-foreground">Avisos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><Zap className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-2xl font-bold">{totalAlerts}</p>
              <p className="text-[11px] text-muted-foreground">Alertas Críticos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Configuração de Metas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {goals.map(g => (
                    <div key={g.id} className="p-3 rounded-lg border border-border/50 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">{g.name}</Label>
                        <Switch checked={g.enabled} onCheckedChange={() => toggleGoal(g.id)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={g.target}
                          onChange={(e) => updateGoalTarget(g.id, Number(e.target.value))}
                          className="h-8 w-20 text-sm"
                          disabled={!g.enabled}
                        />
                        <span className="text-xs text-muted-foreground">{g.unit}</span>
                        <Badge variant="outline" className="text-[9px] ml-auto">
                          {g.direction === "higher" ? "↑ Maior melhor" : "↓ Menor melhor"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição de Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {scoreDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Performance por Meta</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={goalPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                <XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} className="fill-muted-foreground" />
                <Tooltip />
                <Bar dataKey="onTarget" name="No alvo" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Collaborator KPI Cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> KPIs por Colaborador
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collaboratorKPIs.sort((a, b) => a.overallScore - b.overallScore).map((c, idx) => (
                <motion.div
                  key={c.personId}
                  className="p-4 rounded-xl border border-border/50 bg-card hover:shadow-md transition-shadow"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  {/* Person header */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm">{c.personName}</p>
                      <p className="text-[10px] text-muted-foreground">{c.department || "Sem dept."}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${getScoreColor(c.overallScore)}`}>
                        {c.overallScore}
                      </span>
                      <p className="text-[9px] text-muted-foreground">Score</p>
                    </div>
                  </div>

                  {/* Score bar */}
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-3">
                    <motion.div
                      className={`h-full rounded-full ${getScoreBg(c.overallScore)}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${c.overallScore}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>

                  {/* KPIs */}
                  <div className="space-y-1.5">
                    {c.kpis.map(k => (
                      <div key={k.goalId} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground truncate flex-1 mr-2">{k.goalName}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono tabular-nums">{k.current}{k.unit}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="font-mono tabular-nums text-muted-foreground">{k.target}{k.unit}</span>
                          {k.status === "critical" && <AlertTriangle className="h-3 w-3 text-destructive" />}
                          {k.status === "warning" && <AlertTriangle className="h-3 w-3 text-yellow-600" />}
                          {k.status === "on_track" && <CheckCircle className="h-3 w-3 text-emerald-600" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Alert badges */}
                  {c.kpis.some(k => k.status !== "on_track") && (
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {c.kpis.filter(k => k.status === "critical").map(k => (
                        <Badge key={k.goalId} className="bg-destructive/20 text-destructive border-destructive/30 text-[9px]">
                          {k.goalName.substring(0, 15)}
                        </Badge>
                      ))}
                      {c.kpis.filter(k => k.status === "warning").map(k => (
                        <Badge key={k.goalId} className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-[9px]">
                          {k.goalName.substring(0, 15)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
