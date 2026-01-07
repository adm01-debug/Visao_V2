/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Relatórios
 */

import { Helmet } from 'react-helmet-async';
import { PageContent } from '@/components/MainLayout';
import { ReportsPanel } from '@/components/ReportsPanel';

export default function ReportsPage() {
  return (
    <>
      <Helmet>
        <title>Relatórios | VISÃO</title>
        <meta name="description" content="Gere relatórios em PDF de alertas, reconhecimento e analytics" />
      </Helmet>
      
      <PageContent>
        <ReportsPanel />
      </PageContent>
    </>
  );
}
