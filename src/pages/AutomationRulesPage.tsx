/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página de Regras de Automação
 */

import { PageContent, PageHeader } from "@/components/MainLayout";
import { AutomationRulesManager } from "@/components/AutomationRulesManager";
import { RuleExecutionHistory } from "@/components/RuleExecutionHistory";
import { Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AutomationRulesPage() {
  return (
    <PageContent>
      <PageHeader
        title="Regras de Automação"
        subtitle="Configure ações automáticas baseadas em condições de alertas"
        icon={<Zap className="h-5 w-5 text-primary" />}
      />

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
