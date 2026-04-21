/**
 * VISÃO - Metas e Alertas Inteligentes (Refactored)
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Target, AlertTriangle, CheckCircle, Users, Zap, Settings, BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

import { DEFAULT_GOALS, generateKPIs, getScoreColor, type KPIGoal } from "./goals-alerts/goalsTypes";
import { CollaboratorKPICard } from "./goals-alerts/CollaboratorKPICard";
import { GoalsSettingsPanel } from "./goals-alerts/GoalsSettingsPanel";
import { PageMeta } from '@/components/PageMeta';

export default function GoalsAlertsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<KPIGoal[]>(DEFAULT_GOALS);
  const [showSettings, setShowSettings] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["goals-persons"],
    queryFn: async () => {
      const { data } = await supabase.from("registered_persons").select("id, name, department, role").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const departments = useMemo(() => {
    const depts = new Set(persons.map(p => p.department).filter(Boolean));
    return Array.from(depts) as string[];
  }, [persons]);

  const collaboratorKPIs = useMemo(() => {
    const filteredPersons = departmentFilter === "all" ? persons : persons.filter(p => p.department === departmentFilter);
    if (filteredPersons.length === 0) {
      const demo = [
        { id: "d1", name: "Carlos Silva", department: "Produção" }, { id: "d2", name: "Ana Santos", department: "Produção" },
        { id: "d3", name: "João Oliveira", department: "Logística" }, { id: "d4", name: "Maria Costa", department: "Escritório" },
        { id: "d5", name: "Pedro Lima", department: "Produção" }, { id: "d6", name: "Fernanda Alves", department: "Logística" },
        { id: "d7", name: "Ricardo Souza", department: "Produção" }, { id: "d8", name: "Juliana Ferreira", department: "Escritório" },
      ];
      return demo.map(p => generateKPIs(p.id, p.name, p.department, goals));
    }
    return filteredPersons.map(p => generateKPIs(p.id, p.name, p.department, goals));
  }, [persons, goals, departmentFilter]);

  const totalAlerts = collaboratorKPIs.reduce((s, c) => s + c.kpis.filter(k => k.status === "critical").length, 0);
  const totalWarnings = collaboratorKPIs.reduce((s, c) => s + c.kpis.filter(k => k.status === "warning").length, 0);
  const avgScore = collaboratorKPIs.length > 0 ? Math.round(collaboratorKPIs.reduce((s, c) => s + c.overallScore, 0) / collaboratorKPIs.length) : 0;
  const onTrackCount = collaboratorKPIs.filter(c => c.overallScore >= 80).length;

  const scoreDistribution = useMemo(() => {
    const buckets = [
      { range: "90-100", count: 0, fill: "hsl(var(--chart-1))" }, { range: "70-89", count: 0, fill: "hsl(var(--chart-2))" },
      { range: "50-69", count: 0, fill: "hsl(var(--chart-3))" }, { range: "0-49", count: 0, fill: "hsl(var(--chart-4))" },
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
      const onTarget = collaboratorKPIs.filter(c => c.kpis.find(k => k.goalId === g.id && k.status === "on_track")).length;
      return { name: g.name.substring(0, 20), onTarget, total: collaboratorKPIs.length };
    });
  }, [goals, collaboratorKPIs]);

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <PageMeta title="Metas e Alertas" description="Configure metas inteligentes e KPIs de desempenho" />
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
            <SelectTrigger className="w-44"><SelectValue placeholder="Departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              {departments.length === 0 && (<><SelectItem value="Produção">Produção</SelectItem><SelectItem value="Logística">Logística</SelectItem><SelectItem value="Escritório">Escritório</SelectItem></>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-3.5 w-3.5 mr-1.5" /> Metas
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div><div><p className={`text-2xl font-bold ${getScoreColor(avgScore)}`}>{avgScore}%</p><p className="text-[11px] text-muted-foreground">Score Médio</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-success/10"><CheckCircle className="h-5 w-5 text-success" /></div><div><p className="text-2xl font-bold">{onTrackCount}/{collaboratorKPIs.length}</p><p className="text-[11px] text-muted-foreground">Dentro da Meta</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-warning/10"><AlertTriangle className="h-5 w-5 text-warning" /></div><div><p className="text-2xl font-bold">{totalWarnings}</p><p className="text-[11px] text-muted-foreground">Avisos</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-destructive/10"><Zap className="h-5 w-5 text-destructive" /></div><div><p className="text-2xl font-bold">{totalAlerts}</p><p className="text-[11px] text-muted-foreground">Alertas Críticos</p></div></CardContent></Card>
      </div>

      <AnimatePresence>
        {showSettings && <GoalsSettingsPanel goals={goals} onToggle={(id) => setGoals(prev => prev.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g))} onUpdateTarget={(id, value) => setGoals(prev => prev.map(g => g.id === id ? { ...g, target: value } : g))} />}
      </AnimatePresence>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Distribuição de Scores</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={scoreDistribution}><CartesianGrid strokeDasharray="3 3" className="stroke-border/30" /><XAxis dataKey="range" tick={{ fontSize: 11 }} className="fill-muted-foreground" /><YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" /><Tooltip /><Bar dataKey="count" radius={[4, 4, 0, 0]}>{scoreDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}</Bar></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Performance por Meta</CardTitle></CardHeader><CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={goalPerformance} layout="vertical"><CartesianGrid strokeDasharray="3 3" className="stroke-border/30" /><XAxis type="number" tick={{ fontSize: 10 }} className="fill-muted-foreground" /><YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={120} className="fill-muted-foreground" /><Tooltip /><Bar dataKey="onTarget" name="No alvo" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} /></BarChart>
          </ResponsiveContainer>
        </CardContent></Card>
      </div>

      {/* Collaborator KPI Cards */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> KPIs por Colaborador</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collaboratorKPIs.sort((a, b) => a.overallScore - b.overallScore).map((c, idx) => (
                <CollaboratorKPICard key={c.personId} collaborator={c} index={idx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
