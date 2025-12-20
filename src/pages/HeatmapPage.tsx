/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Mapa de Calor
 */

import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { HeatmapVisualization } from '@/components/HeatmapVisualization';

export default function HeatmapPage() {
  return (
    <>
      <Helmet>
        <title>Mapa de Calor | VISÃO</title>
        <meta name="description" content="Visualize mapas de calor de movimento por zona e câmera" />
      </Helmet>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <HeatmapVisualization />
        </main>
      </div>
    </>
  );
}
