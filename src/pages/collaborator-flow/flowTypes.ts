/**
 * VISÃO - CollaboratorFlowMap Types & Helpers
 */

export interface ZoneData {
  id: string;
  name: string;
  type: string;
  color: string;
  currentPeople: number;
  capacity: number;
  avgDwell: number;
}

export interface FlowEdge {
  from: string;
  to: string;
  count: number;
  avgTransitTime: number;
}

export interface Bottleneck {
  zoneName: string;
  reason: string;
  severity: "warning" | "critical";
  metric: string;
}

export const DEMO_ZONES: ZoneData[] = [
  { id: "z1", name: "Linha de Produção A", type: "productive", color: "hsl(142, 71%, 45%)", currentPeople: 12, capacity: 15, avgDwell: 120 },
  { id: "z2", name: "Linha de Produção B", type: "productive", color: "hsl(142, 71%, 45%)", currentPeople: 8, capacity: 12, avgDwell: 95 },
  { id: "z3", name: "Escritório", type: "productive", color: "hsl(217, 91%, 60%)", currentPeople: 6, capacity: 10, avgDwell: 180 },
  { id: "z4", name: "Refeitório", type: "idle", color: "hsl(38, 92%, 50%)", currentPeople: 14, capacity: 8, avgDwell: 35 },
  { id: "z5", name: "Estacionamento", type: "transit", color: "hsl(263, 90%, 64%)", currentPeople: 3, capacity: 50, avgDwell: 5 },
  { id: "z6", name: "Área de Descanso", type: "idle", color: "hsl(38, 92%, 50%)", currentPeople: 4, capacity: 6, avgDwell: 20 },
  { id: "z7", name: "Almoxarifado", type: "productive", color: "hsl(187, 96%, 42%)", currentPeople: 2, capacity: 4, avgDwell: 15 },
  { id: "z8", name: "Entrada Principal", type: "transit", color: "hsl(263, 90%, 64%)", currentPeople: 1, capacity: 30, avgDwell: 2 },
];

export function getOccupancyColor(current: number, capacity: number) {
  const rate = current / capacity;
  if (rate > 1) return "text-destructive";
  if (rate > 0.8) return "text-warning";
  return "text-success";
}

export function getOccupancyBg(current: number, capacity: number) {
  const rate = current / capacity;
  if (rate > 1) return "bg-destructive/20 border-destructive/30";
  if (rate > 0.8) return "bg-warning/20 border-warning/30";
  return "bg-success/10 border-success/20";
}
