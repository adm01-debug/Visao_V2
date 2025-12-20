/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Reconhecimento de Placas (ALPR)
 */

import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { LicensePlateRecognition } from '@/components/LicensePlateRecognition';

export default function LicensePlatePage() {
  return (
    <>
      <Helmet>
        <title>Reconhecimento de Placas | VISÃO</title>
        <meta name="description" content="Sistema de reconhecimento automático de placas veiculares" />
      </Helmet>
      
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <LicensePlateRecognition />
        </main>
      </div>
    </>
  );
}
