/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página de Regras de Automação
 */

import { Sidebar } from "@/components/Sidebar";
import { AutomationRulesManager } from "@/components/AutomationRulesManager";
import { RuleExecutionHistory } from "@/components/RuleExecutionHistory";
import { Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AutomationRulesPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Regras de Automação</h1>
              <p className="text-muted-foreground">
                Configure ações automáticas baseadas em condições de alertas
              </p>
            </div>
          </div>

          {/* Tabs for Rules and History */}
          <Tabs defaultValue="rules" className="space-y-4">
            <TabsList>
              <TabsTrigger value="rules">Regras</TabsTrigger>
              <TabsTrigger value="history">Histórico de Execuções</TabsTrigger>
            </TabsList>

            <TabsContent value="rules">
              <AutomationRulesManager />
            </TabsContent>

            <TabsContent value="history">
              <RuleExecutionHistory />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
