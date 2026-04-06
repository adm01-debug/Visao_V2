/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página de Regras de Automação - Design Premium
 */

import { PageContent } from "@/components/layout/MainLayout";
import { AutomationRulesManager } from "@/components/AutomationRulesManager";
import { RuleExecutionHistory } from "@/components/RuleExecutionHistory";
import { Zap, ListChecks, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageMeta } from '@/components/PageMeta';

export default function AutomationRulesPage() {
  return (
    <PageContent>
      <PageMeta title="Regras de Automação" description="Crie e gerencie regras de automação inteligentes" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Regras de Automação</h1>
          <p className="text-sm text-muted-foreground">Configure ações automáticas baseadas em condições de alertas</p>
        </div>
      </div>

      <Tabs defaultValue="rules" className="mt-6 space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto bg-muted/50 border border-border/40">
          <TabsTrigger value="rules" className="flex-1 sm:flex-none gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ListChecks className="w-4 h-4" />
            Regras
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 sm:flex-none gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <History className="w-4 h-4" />
            Histórico
          </TabsTrigger>
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
