/**
 * VISÃO - Página: Reconhecimento de Placas (ALPR) - Design Premium
 */

import { useState } from 'react';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { LicensePlateRecognition } from '@/components/LicensePlateRecognition';
import { ALPRDashboard } from '@/components/ALPRDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { BarChart3, Car, Plus, Shield, History, RefreshCw } from 'lucide-react';
import { useLicensePlateData } from '@/components/license-plate/useLicensePlateData';
import { VehiclesTab } from '@/components/license-plate/VehiclesTab';
import { DetectionsHistoryTab } from '@/components/license-plate/DetectionsHistoryTab';
import { VehicleFormDialog } from '@/components/license-plate/VehicleFormDialog';
import { cn } from '@/lib/utils';

export default function LicensePlatePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const {
    vehicles,
    detections,
    isAddDialogOpen,
    setIsAddDialogOpen,
    editingVehicle,
    formData,
    setFormData,
    fetchVehicles,
    fetchDetections,
    handleSaveVehicle,
    handleDeleteVehicle,
    handleSearchDetections,
    openEditDialog,
    openAddDialog,
  } = useLicensePlateData();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchVehicles(), fetchDetections()]);
    setRefreshing(false);
  };

  return (
    <PageContent>
      <PageMeta
        title="Placas Veiculares"
        description="Detecção e gestão de placas veiculares ALPR"
      />

      {/* Header */}
      <div className="border-b border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20">
                <Car className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Reconhecimento de Placas</h1>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  Sistema ALPR - Leitura Automática de Placas
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshing}
                className="border-border/40"
                aria-label="Atualizar"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </Button>
              <Button onClick={openAddDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Cadastrar Veículo
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 bg-muted/50">
              <TabsTrigger value="dashboard" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="detection" className="gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Detecção</span>
              </TabsTrigger>
              <TabsTrigger value="vehicles" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Veículos</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Histórico</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Content */}
      <div className="container py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsContent value="dashboard" className="mt-0">
            <ALPRDashboard />
          </TabsContent>
          <TabsContent value="detection" className="mt-0">
            <LicensePlateRecognition />
          </TabsContent>
          <TabsContent value="vehicles" className="mt-0">
            <VehiclesTab
              vehicles={vehicles}
              onEdit={openEditDialog}
              onDelete={handleDeleteVehicle}
            />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <DetectionsHistoryTab detections={detections} onSearch={handleSearchDetections} />
          </TabsContent>
        </Tabs>
      </div>

      <VehicleFormDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        editingVehicle={editingVehicle}
        formData={formData}
        onFormChange={setFormData}
        onSave={handleSaveVehicle}
      />
    </PageContent>
  );
}
