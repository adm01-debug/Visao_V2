import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CspAnomalyAlert {
  id: string;
  created_at: string;
  new_values: {
    last_hour?: number;
    baseline_avg?: number;
    ratio?: number;
    top_directive?: string;
    top_blocked?: string;
  } | null;
}

/**
 * Onda 66 — Badge no header exibindo anomalias CSP das últimas 24h.
 * Consulta `audit_logs` com `action = 'security.csp_anomaly'`.
 * Visível apenas para admins; oculto quando não há anomalias.
 */
export function CspAnomalyBadge({ className }: { className?: string }) {
  const { isAdmin, loading } = useUserRole();

  const { data } = useQuery({
    queryKey: ["csp-anomaly-alerts"],
    enabled: isAdmin && !loading,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    retry: 1,
    queryFn: async (): Promise<CspAnomalyAlert[]> => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("audit_logs")
        .select("id, created_at, new_values")
        .eq("action", "security.csp_anomaly")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as CspAnomalyAlert[];
    },
  });

  const { count, latest } = useMemo(() => {
    const rows = data ?? [];
    return { count: rows.length, latest: rows[0] ?? null };
  }, [data]);

  if (!isAdmin || loading || count === 0) return null;

  const ratio = latest?.new_values?.ratio;
  const hourly = latest?.new_values?.last_hour;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/admin/csp-reports"
          aria-label={`${count} ${count === 1 ? "anomalia CSP" : "anomalias CSP"} nas últimas 24h`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
            "bg-destructive/10 text-destructive hover:bg-destructive/15 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <ShieldAlert className="h-3 w-3" aria-hidden="true" />
          {count} CSP {count === 1 ? "anomalia" : "anomalias"}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-[260px]">
          <p className="font-medium">Anomalias CSP (24h)</p>
          {latest && (
            <ul className="mt-1 space-y-0.5 text-xs">
              {typeof hourly === "number" && <li>• Última hora: {hourly}</li>}
              {typeof ratio === "number" && <li>• Ratio vs. baseline: {ratio}×</li>}
              {latest.new_values?.top_directive && (
                <li className="truncate">• Diretiva: <code>{latest.new_values.top_directive}</code></li>
              )}
            </ul>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground">Clique para investigar.</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
