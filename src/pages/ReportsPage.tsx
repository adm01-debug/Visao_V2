/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Relatórios
 */

import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { ReportsPanel } from '@/components/ReportsPanel';

export default function ReportsPage() {
  return (
    <>
      <PageMeta title="Relatórios" description="Gere e exporte relatórios detalhados do sistema" />

      <PageContent>
        <ReportsPanel />
      </PageContent>
    </>
  );
}
