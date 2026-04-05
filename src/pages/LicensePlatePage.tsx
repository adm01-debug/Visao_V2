/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Reconhecimento de Placas (ALPR) - Expandida
 */

import { useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import { Sidebar } from '@/components/Sidebar';
import { LicensePlateRecognition } from '@/components/LicensePlateRecognition';
import { ALPRDashboard } from '@/components/ALPRDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Car, Plus, Shield, History, RefreshCw } from 'lucide-react';
import { useLicensePlateData } from '@/components/license-plate/useLicensePlateData';
import { VehiclesTab } from '@/components/license-plate/VehiclesTab';
import { DetectionsHistoryTab } from '@/components/license-plate/DetectionsHistoryTab';
import { VehicleFormDialog } from '@/components/license-plate/VehicleFormDialog';

export default function LicensePlatePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    vehicles, detections, isAddDialogOpen, setIsAddDialogOpen,
    editingVehicle, formData, setFormData, fetchVehicles, fetchDetections,
    handleSaveVehicle, handleDeleteVehicle, handleSearchDetections,
    openEditDialog, openAddDialog,
  } = useLicensePlateData();

  return (
    <>
      <PageMeta title="Placas Veiculares" description="Detecção e gestão de placas veiculares ALPR" />

      <div role="main" aria-label="Reconhecimento de placas" className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Reconhecimento de Placas</h1>
                <p className="text-muted-foreground">Sistema ALPR - Leitura Automática de Placas</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => { fetchVehicles(); fetchDetections(); }}>
                  <RefreshCw className="h-4 w-4 mr-2" />Atualizar
                </Button>
                <Button onClick={openAddDialog}>
                  <Plus className="h-4 w-4 mr-2" />Cadastrar Veículo
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="h-4 w-4" />Dashboard</TabsTrigger>
                <TabsTrigger value="detection" className="gap-2"><Car className="h-4 w-4" />Detecção</TabsTrigger>
                <TabsTrigger value="vehicles" className="gap-2"><Shield className="h-4 w-4" />Veículos</TabsTrigger>
                <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" />Histórico</TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard"><ALPRDashboard /></TabsContent>
              <TabsContent value="detection"><LicensePlateRecognition /></TabsContent>
              <TabsContent value="vehicles">
                <VehiclesTab vehicles={vehicles} onEdit={openEditDialog} onDelete={handleDeleteVehicle} />
              </TabsContent>
              <TabsContent value="history">
                <DetectionsHistoryTab detections={detections} onSearch={handleSearchDetections} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      <VehicleFormDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}
        editingVehicle={editingVehicle} formData={formData} onFormChange={setFormData} onSave={handleSaveVehicle} />
    </>
  );
}
