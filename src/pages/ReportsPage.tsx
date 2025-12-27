/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Relatórios
 */

import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { ReportsPanel } from '@/components/ReportsPanel';

export default function ReportsPage() {

  return (
    <>
      <Helmet>
        <title>Relatórios | VISÃO</title>
        <meta name="description" content="Gere relatórios em PDF de alertas, reconhecimento e analytics" />
      </Helmet>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <ReportsPanel />
        </main>
      </div>
    </>
  );
}
