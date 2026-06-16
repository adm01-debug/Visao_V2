import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getCoverageStatus,
  type CoverageMetric,
  type CoverageTotals,
} from "@/types/coverage";

const STATUS_CLASS: Record<ReturnType<typeof getCoverageStatus>, string> = {
  good: "text-success",
  warning: "text-warning",
  poor: "text-destructive",
};

const METRICS: { key: keyof CoverageTotals; label: string }[] = [
  { key: "statements", label: "Statements" },
  { key: "branches", label: "Branches" },
  { key: "functions", label: "Functions" },
  { key: "lines", label: "Lines" },
];

const formatMetric = (metric: CoverageMetric) =>
  `${metric.covered.toLocaleString("pt-BR")} / ${metric.total.toLocaleString("pt-BR")}`;

interface CoverageStatsCardsProps {
  totals: CoverageTotals;
}

export const CoverageStatsCards = ({ totals }: CoverageStatsCardsProps) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {METRICS.map(({ key, label }) => {
      const metric = totals[key];
      const status = getCoverageStatus(metric.pct);
      return (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardDescription>{label}</CardDescription>
            <CardTitle className={cn("text-3xl font-bold tabular-nums", STATUS_CLASS[status])}>
              {metric.pct.toFixed(2)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground tabular-nums">{formatMetric(metric)} cobertos</p>
          </CardContent>
        </Card>
      );
    })}
  </div>
);
