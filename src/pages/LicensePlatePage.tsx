/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Reconhecimento de Placas (ALPR)
 */

import { Helmet } from 'react-helmet-async';
import { Sidebar } from '@/components/Sidebar';
import { LicensePlateRecognition } from '@/components/LicensePlateRecognition';
import { ALPRDashboard } from '@/components/ALPRDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Car } from 'lucide-react';

export default function LicensePlatePage() {

  return (
    <>
      <Helmet>
        <title>Reconhecimento de Placas | VISÃO</title>
        <meta name="description" content="Sistema de reconhecimento automático de placas veiculares" />
      </Helmet>
      
      <div role="main" aria-label="Reconhecimento de placas" className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="detection" className="gap-2">
                <Car className="h-4 w-4" />
                Detecção
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="dashboard">
              <ALPRDashboard />
            </TabsContent>
            
            <TabsContent value="detection">
              <LicensePlateRecognition />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}
