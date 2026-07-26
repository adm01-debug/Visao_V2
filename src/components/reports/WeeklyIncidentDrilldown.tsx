import { memo, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListFilter, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type DrilldownSeverity = "low" | "medium" | "high" | "critical";

export interface DrilldownAlert {
  id: string;
  severity: DrilldownSeverity;
  title: string;
  camera_id: string | null;
  triggered_at: string;
  resolved_at: string | null;
  acknowledged_at: string | null;
}

/** Origem do clique que abriu o drill-down (dia, severidade ou câmera). */
export interface DrilldownSelection {
  /** Rótulo do dia no formato dd/MM. */
  day?: string;
  severity?: DrilldownSeverity;
  cameraId?: string;
  /** Restringe o dia apenas a incidentes críticos/alta (barra "Críticos/Alta"). */
  criticalOnly?: boolean;
}

const severityLabel: Record<DrilldownSeverity, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const severityVariant: Record<DrilldownSeverity, "outline" | "secondary" | "default" | "destructive"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
  critical: "destructive",
};

interface WeeklyIncidentDrilldownProps {
  alerts: DrilldownAlert[];
  cameras: Array<{ id: string; name: string }>;
  selection: DrilldownSelection | null;
  onClear: () => void;
  className?: string;
}

const MAX_ROWS = 200;

export const WeeklyIncidentDrilldown = memo(function WeeklyIncidentDrilldown({
  alerts,
  cameras,
  selection,
  onClear,
  className,
}: WeeklyIncidentDrilldownProps) {
  const [cameraFilter, setCameraFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const cameraNameOf = (id: string | null): string =>
    (id && cameras.find((c) => c.id === id)?.name) || "Câmera desconhecida";

  const filtered = useMemo(() => {
    if (!selection) return [];
    return alerts.filter((a) => {
      if (selection.day && format(new Date(a.triggered_at), "dd/MM") !== selection.day) return false;
      if (selection.criticalOnly && a.severity !== "critical" && a.severity !== "high") return false;
      if (selection.severity && a.severity !== selection.severity) return false;
      if (selection.cameraId && a.camera_id !== selection.cameraId) return false;
      if (cameraFilter !== "all" && a.camera_id !== cameraFilter) return false;
      if (severityFilter !== "all" && a.severity !== severityFilter) return false;
      return true;
    });
  }, [alerts, selection, cameraFilter, severityFilter]);

  if (!selection) return null;

  const contextChips: string[] = [];
  if (selection.day) contextChips.push(`Dia ${selection.day}`);
  if (selection.criticalOnly) contextChips.push("Críticos/Alta");
  if (selection.severity) contextChips.push(`Severidade ${severityLabel[selection.severity]}`);
  if (selection.cameraId) contextChips.push(cameraNameOf(selection.cameraId));

  // Só oferece câmeras presentes no recorte selecionado — evita filtros que zeram a lista.
  const camerasInScope = Array.from(
    new Set(
      alerts
        .filter((a) => {
          if (selection.day && format(new Date(a.triggered_at), "dd/MM") !== selection.day) return false;
          if (selection.criticalOnly && a.severity !== "critical" && a.severity !== "high") return false;
          if (selection.severity && a.severity !== selection.severity) return false;
          return Boolean(a.camera_id);
        })
        .map((a) => a.camera_id as string)
    )
  );

  return (
    <Card className={cn("border-primary/40", className)} data-testid="weekly-drilldown">
      <CardHeader>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListFilter className="h-5 w-5 text-primary" />
              Incidentes selecionados
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 mt-2">
              {contextChips.map((chip) => (
                <Badge key={chip} variant="secondary">
                  {chip}
                </Badge>
              ))}
              <span className="text-muted-foreground">{filtered.length} incidente(s)</span>
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={cameraFilter} onValueChange={setCameraFilter}>
              <SelectTrigger className="w-[190px]">
                <SelectValue placeholder="Câmera" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as câmeras</SelectItem>
                {camerasInScope.map((id) => (
                  <SelectItem key={id} value={id}>
                    {cameraNameOf(id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas severidades</SelectItem>
                {(Object.keys(severityLabel) as DrilldownSeverity[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {severityLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCameraFilter("all");
                setSeverityFilter("all");
                onClear();
              }}
              aria-label="Fechar detalhamento"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum incidente corresponde a esta seleção e aos filtros aplicados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Incidente</TableHead>
                  <TableHead>Câmera</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, MAX_ROWS).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {format(new Date(a.triggered_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="max-w-[280px] truncate">{a.title}</TableCell>
                    <TableCell>{cameraNameOf(a.camera_id)}</TableCell>
                    <TableCell>
                      <Badge variant={severityVariant[a.severity]}>{severityLabel[a.severity]}</Badge>
                    </TableCell>
                    <TableCell>
                      {a.resolved_at ? (
                        <span className="text-success">Resolvido</span>
                      ) : a.acknowledged_at ? (
                        <span className="text-warning">Reconhecido</span>
                      ) : (
                        <span className="text-muted-foreground">Aberto</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filtered.length > MAX_ROWS && (
              <p className="text-xs text-muted-foreground mt-3">
                Exibindo os {MAX_ROWS} primeiros de {filtered.length} incidentes.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default WeeklyIncidentDrilldown;
