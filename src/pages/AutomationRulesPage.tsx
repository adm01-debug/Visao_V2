/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página de Regras de Automação
 */

import { PageContent } from "@/components/layout/MainLayout";
import { AutomationRulesManager } from "@/components/AutomationRulesManager";
import { RuleExecutionHistory } from "@/components/RuleExecutionHistory";
import { Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AutomationRulesPage() {
  return (
    <PageContent>
      <div className="flex items-center gap-3 mb-6">
        <Zap className="h-5 w-5 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Regras de Automação</h1>
          <p className="text-sm text-muted-foreground">Configure ações automáticas baseadas em condições de alertas</p>
        </div>
      </div>

      {/* Tabs for Rules and History */}
      <Tabs defaultValue="rules" className="mt-6 space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="rules" className="flex-1 sm:flex-none">Regras</TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="rules">
          <AutomationRulesManager />
        </TabsContent>

        <TabsContent value="history">
          <RuleExecutionHistory />
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
