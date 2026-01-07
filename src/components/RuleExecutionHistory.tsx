/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente de Histórico de Execuções de Regras
 */

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  History,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Zap,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Bell,
  Mail,
  Video,
  Lock,
  Users,
  Camera,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useRuleExecutions, RuleExecution } from "@/hooks/useRuleExecutions";
import { useRules } from "@/hooks/useRules";
import { cn } from "@/lib/utils";

const actionIcons: Record<string, typeof Bell> = {
  alert: Bell,
  notify: Mail,
  record: Video,
  lockdown: Lock,
  dispatch: Users,
};

const actionLabels: Record<string, string> = {
  alert: "Alerta",
  notify: "Notificação",
  record: "Gravação",
  lockdown: "Bloqueio",
  dispatch: "Despacho",
};

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Sucesso",
    className: "text-green-500 bg-green-500/10",
  },
  error: {
    icon: XCircle,
    label: "Erro",
    className: "text-red-500 bg-red-500/10",
  },
  partial: {
    icon: AlertCircle,
    label: "Parcial",
    className: "text-yellow-500 bg-yellow-500/10",
  },
};

function ExecutionItem({ execution }: { execution: RuleExecution }) {
  const [isOpen, setIsOpen] = useState(false);
  const status = statusConfig[execution.status] || statusConfig.success;
  const StatusIcon = status.icon;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
        <CollapsibleTrigger asChild>
          <div className="flex items-start justify-between cursor-pointer">
            <div className="flex items-start gap-3 flex-1">
              <div className={cn("p-1.5 rounded-full", status.className)}>
                <StatusIcon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">
                    {execution.rule?.name || "Regra removida"}
                  </span>
                  {execution.rule?.severity && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        execution.rule.severity === "critical" &&
                          "border-red-500 text-red-500",
                        execution.rule.severity === "high" &&
                          "border-orange-500 text-orange-500",
                        execution.rule.severity === "medium" &&
                          "border-yellow-500 text-yellow-500",
                        execution.rule.severity === "low" &&
                          "border-blue-500 text-blue-500"
                      )}
                    >
                      {execution.rule.severity}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {formatDistanceToNow(new Date(execution.triggered_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </span>
                  {execution.execution_time_ms && (
                    <>
                      <span>•</span>
                      <span>{execution.execution_time_ms}ms</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {execution.actions_executed.slice(0, 3).map((action) => {
                  const Icon = actionIcons[action] || Zap;
                  return (
                    <div
                      key={action}
                      className="p-1 rounded bg-muted"
                      title={actionLabels[action] || action}
                    >
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                  );
                })}
                {execution.actions_executed.length > 3 && (
                  <div className="px-1.5 rounded bg-muted text-xs text-muted-foreground flex items-center">
                    +{execution.actions_executed.length - 3}
                  </div>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 pt-3 border-t space-y-3">
            {/* Detalhes do alerta */}
            {execution.alert && (
              <div className="flex items-start gap-2 text-sm">
                <Camera className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-muted-foreground">
                    {execution.alert.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Câmera: {execution.alert.camera_name}
                  </p>
                </div>
              </div>
            )}

            {/* Ações executadas */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Ações executadas:
              </p>
              <div className="flex flex-wrap gap-2">
                {execution.actions_executed.map((action) => {
                  const Icon = actionIcons[action] || Zap;
                  return (
                    <Badge key={action} variant="secondary" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {actionLabels[action] || action}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Erro se houver */}
            {execution.error_message && (
              <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500">{execution.error_message}</p>
              </div>
            )}

            {/* Timestamp completo */}
            <p className="text-xs text-muted-foreground">
              {format(new Date(execution.triggered_at), "PPpp", {
                locale: ptBR,
              })}
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function RuleExecutionHistory() {
  const [filterRuleId, setFilterRuleId] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  const { rules } = useRules();
  const { executions, loading, refetch, getStats } = useRuleExecutions(
    filterRuleId !== "all" ? filterRuleId : undefined
  );

  const filteredExecutions = executions.filter((e) => {
    if (filterStatus !== "all" && e.status !== filterStatus) return false;
    return true;
  });

  const stats = getStats();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Execuções
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-muted text-center">
            <p className="text-lg font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="p-2 rounded-lg bg-green-500/10 text-center">
            <p className="text-lg font-bold text-green-500">{stats.success}</p>
            <p className="text-xs text-muted-foreground">Sucesso</p>
          </div>
          <div className="p-2 rounded-lg bg-red-500/10 text-center">
            <p className="text-lg font-bold text-red-500">{stats.errors}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
          <div className="p-2 rounded-lg bg-blue-500/10 text-center">
            <p className="text-lg font-bold text-blue-500">{stats.avgTime}ms</p>
            <p className="text-xs text-muted-foreground">Média</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={filterRuleId} onValueChange={setFilterRuleId}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por regra" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as regras</SelectItem>
              {rules.map((rule) => (
                <SelectItem key={rule.id} value={rule.id}>
                  {rule.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Execution list */}
        <ScrollArea className="h-[400px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredExecutions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <History className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhuma execução encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredExecutions.map((execution) => (
                <ExecutionItem key={execution.id} execution={execution} />
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
