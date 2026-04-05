/**
 * VISÃO - GoalsAlerts KPI Types & Constants
 */

export interface KPIGoal {
  id: string;
  name: string;
  metric: string;
  target: number;
  unit: string;
  direction: "higher" | "lower";
  alertThreshold: number;
  enabled: boolean;
}

export interface CollaboratorKPI {
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
    deviation: number;
  }[];
  overallScore: number;
}

export const DEFAULT_GOALS: KPIGoal[] = [
  { id: "g1", name: "Tempo Produtivo Mínimo", metric: "productive_hours", target: 6, unit: "h", direction: "higher", alertThreshold: 20, enabled: true },
  { id: "g2", name: "Máx. Pausas por Turno", metric: "break_count", target: 4, unit: "pausas", direction: "lower", alertThreshold: 25, enabled: true },
  { id: "g3", name: "Pontualidade", metric: "punctuality_rate", target: 95, unit: "%", direction: "higher", alertThreshold: 10, enabled: true },
  { id: "g4", name: "Tempo Ocioso Máximo", metric: "idle_minutes", target: 60, unit: "min", direction: "lower", alertThreshold: 30, enabled: true },
  { id: "g5", name: "Permanência em Zona Produtiva", metric: "zone_productive_pct", target: 70, unit: "%", direction: "higher", alertThreshold: 15, enabled: true },
  { id: "g6", name: "Detecções Comportamentais", metric: "behavior_incidents", target: 0, unit: "inc.", direction: "lower", alertThreshold: 50, enabled: true },
];

export function generateKPIs(id: string, name: string, dept: string | null, goals: KPIGoal[]): CollaboratorKPI {
  const kpis = goals.filter(g => g.enabled).map(g => {
    const variance = 0.7 + Math.random() * 0.6;
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
    return { goalId: g.id, goalName: g.name, current, target: g.target, unit: g.unit, direction: g.direction, status, deviation: Math.round(deviation) };
  });
  const scores = kpis.map(k => k.status === "on_track" ? 100 : k.status === "warning" ? 60 : 20);
  const overallScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return { personId: id, personName: name, department: dept, kpis, overallScore };
}

export function getScoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
}

export function getScoreBg(score: number) {
  if (score >= 80) return "bg-success";
  if (score >= 60) return "bg-warning";
  return "bg-destructive";
}
