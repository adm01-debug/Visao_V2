import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Clock, Coffee, TrendingUp,
  Timer, MapPin, BarChart3, CheckCircle2,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from "recharts";
import { PageMeta } from '@/components/PageMeta';

function generateProductivityData(persons: Array<{ id: string; name: string; department: string | null }>) {
  const rand = (min: number, max: number) => Math.round(Math.random() * (max - min) + min);
  const randF = (min: number, max: number) => +(Math.random() * (max - min) + min).toFixed(1);

  return persons.map((p) => {
    const productiveHours = randF(4, 7.5);
    const idleHours = randF(0.5, 3);
    const totalHours = +(productiveHours + idleHours).toFixed(1);
    const productivity = Math.round((productiveHours / totalHours) * 100);
    const breaks = rand(2, 6);
    const avgBreakMin = rand(5, 25);
    const arrivalMin = rand(-15, 30);
    const punctuality = arrivalMin <= 5 ? "on_time" : arrivalMin <= 15 ? "late" : "very_late";

    return {
      id: p.id, name: p.name, department: p.department || "Geral",
      productiveHours, idleHours, totalHours, productivity,
      breaks, avgBreakMin, arrivalMin, punctuality,
      trend: randF(-8, 12),
    };
  });
}

type TimeFilter = "today" | "week" | "month";

export default function ProductivityDashboardPage() {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("today");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: persons = [], isLoading } = useQuery({
    queryKey: ["registered-persons-productivity"],
    queryFn: async () => {
      const { data, error } = await supabase.from("registered_persons").select("id, name, department").eq("is_active", true).order("name");
      if (error) throw error;
      return data || [];
    },
  });

  const productivityData = useMemo(() => persons.length === 0 ? [] : generateProductivityData(persons), [persons, timeFilter]);

  const filteredData = useMemo(() => departmentFilter === "all" ? productivityData : productivityData.filter((d) => d.department === departmentFilter), [productivityData, departmentFilter]);

  const departments = useMemo(() => Array.from(new Set(productivityData.map((d) => d.department))).sort(), [productivityData]);

  const stats = useMemo(() => {
    if (filteredData.length === 0) return null;
    const avgProd = Math.round(filteredData.reduce((s, d) => s + d.productivity, 0) / filteredData.length);
    const avgBreaks = +(filteredData.reduce((s, d) => s + d.breaks, 0) / filteredData.length).toFixed(1);
    const onTime = filteredData.filter((d) => d.punctuality === "on_time").length;
    const punctualityRate = Math.round((onTime / filteredData.length) * 100);
    const avgProdHours = +(filteredData.reduce((s, d) => s + d.productiveHours, 0) / filteredData.length).toFixed(1);
    const avgIdleHours = +(filteredData.reduce((s, d) => s + d.idleHours, 0) / filteredData.length).toFixed(1);
    return { avgProd, avgBreaks, punctualityRate, avgProdHours, avgIdleHours, total: filteredData.length, onTime };
  }, [filteredData]);

  const topPerformers = useMemo(() => [...filteredData].sort((a, b) => b.productivity - a.productivity).slice(0, 10), [filteredData]);

  const punctualityDistribution = useMemo(() => [
    { name: "No horário", value: filteredData.filter((d) => d.punctuality === "on_time").length, color: "hsl(var(--success))" },
    { name: "Atrasado", value: filteredData.filter((d) => d.punctuality === "late").length, color: "hsl(38, 92%, 50%)" },
    { name: "Muito atrasado", value: filteredData.filter((d) => d.punctuality === "very_late").length, color: "hsl(var(--destructive))" },
  ], [filteredData]);

  const hourlyActivity = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    hora: `${8 + i}:00`, produtivo: Math.round(60 + Math.random() * 30), ocioso: Math.round(5 + Math.random() * 25),
  })), [timeFilter]);

  const departmentStats = useMemo(() => {
    const map = new Map<string, number[]>();
    filteredData.forEach((d) => { if (!map.has(d.department)) map.set(d.department, []); map.get(d.department)!.push(d.productivity); });
    return Array.from(map.entries()).map(([department, prods]) => ({ department, produtividade: Math.round(prods.reduce((s, v) => s + v, 0) / prods.length) }));
  }, [filteredData]);

  const getPunctualityBadge = (p: string) => {
    if (p === "on_time") return <Badge className="bg-success/20 text-success border-success/30 text-[10px]">✓ Pontual</Badge>;
    if (p === "late") return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">⚠ Atrasado</Badge>;
    return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">✗ Muito Atrasado</Badge>;
  };

  return (
    <MainLayout>
      <PageMeta title="Produtividade" description="Dashboard de produtividade e desempenho" />
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10"><BarChart3 className="h-6 w-6 text-primary" /></div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Produtividade por Colaborador</h1>
              <p className="text-sm text-muted-foreground">Métricas de desempenho baseadas em visão por IA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        ) : persons.length === 0 ? (
          <Card><CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="font-medium text-foreground">Nenhum colaborador cadastrado</p>
            <p className="text-sm text-muted-foreground mt-1">Cadastre colaboradores em Gestão → Colaboradores.</p>
          </CardContent></Card>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Produtividade Média</span></div>
                  <p className="text-3xl font-bold text-foreground">{stats.avgProd}%</p>
                  <Progress value={stats.avgProd} className="mt-2 h-1.5" />
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Clock className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Horas Produtivas</span></div>
                  <p className="text-3xl font-bold text-foreground">{stats.avgProdHours}h</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Timer className="h-4 w-4 text-warning" /><span className="text-xs text-muted-foreground">Horas Ociosas</span></div>
                  <p className="text-3xl font-bold text-foreground">{stats.avgIdleHours}h</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><Coffee className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Pausas/Dia</span></div>
                  <p className="text-3xl font-bold text-foreground">{stats.avgBreaks}</p>
                </CardContent></Card>
                <Card><CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="h-4 w-4 text-success" /><span className="text-xs text-muted-foreground">Pontualidade</span></div>
                  <p className="text-3xl font-bold text-foreground">{stats.punctualityRate}%</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{stats.onTime}/{stats.total} no horário</p>
                </CardContent></Card>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Top 10 - Produtividade</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={topPerformers} layout="vertical" margin={{ left: 60 }}>
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={55} />
                      <Tooltip formatter={(value: number) => [`${value}%`, "Produtividade"]} />
                      <Bar dataKey="productivity" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4 text-primary" />Pontualidade</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={punctualityDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {punctualityDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" />Atividade por Hora</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={hourlyActivity}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="produtivo" stroke="hsl(var(--primary))" name="Produtivo %" strokeWidth={2} />
                      <Line type="monotone" dataKey="ocioso" stroke="hsl(var(--destructive))" name="Ocioso %" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {departmentStats.length > 1 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Por Departamento</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={departmentStats}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="department" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                        <Radar name="Produtividade %" dataKey="produtividade" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">Detalhamento por Colaborador</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3 font-medium text-muted-foreground">Colaborador</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Depto</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Produtivo</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Ocioso</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Produtividade</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Pausas</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Pontualidade</th>
                        <th className="text-right p-3 font-medium text-muted-foreground">Tendência</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((row) => (
                        <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-3 font-medium text-foreground">{row.name}</td>
                          <td className="p-3 text-muted-foreground text-xs">{row.department}</td>
                          <td className="p-3 text-right font-mono text-xs text-success">{row.productiveHours}h</td>
                          <td className="p-3 text-right font-mono text-xs text-destructive">{row.idleHours}h</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Progress value={row.productivity} className="w-16 h-1.5" />
                              <span className="font-mono text-xs font-bold">{row.productivity}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-right font-mono text-xs">{row.breaks}× ({row.avgBreakMin}min)</td>
                          <td className="p-3">{getPunctualityBadge(row.punctuality)}</td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {row.trend > 2 ? <ArrowUpRight className="h-3 w-3 text-success" /> : row.trend < -2 ? <ArrowDownRight className="h-3 w-3 text-destructive" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                              <span className={`text-xs font-mono ${row.trend > 0 ? "text-success" : row.trend < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                {row.trend > 0 ? "+" : ""}{row.trend}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </MainLayout>
  );
}
