/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Configurações (Refatorada)
 */

import { useState } from 'react';
import { Settings, Bell, Brain, ScanFace, Server, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { useSettingsData } from '@/components/settings/useSettingsData';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { NotificationSettingsTab } from '@/components/settings/NotificationSettingsTab';
import { AnalysisSettingsTab } from '@/components/settings/AnalysisSettingsTab';
import { FaceSettingsTab } from '@/components/settings/FaceSettingsTab';
import { SystemSettingsTab } from '@/components/settings/SystemSettingsTab';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const s = useSettingsData();

  if (s.loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 h-[calc(100vh-4rem)] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="w-6 h-6" />Configurações
          </h1>
          <p className="text-sm text-muted-foreground">Gerencie as configurações do sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={s.loadSettings}><RefreshCw className="w-4 h-4 mr-2" />Recarregar</Button>
          <Button onClick={s.saveSettings} disabled={s.saving}>
            <Save className="w-4 h-4 mr-2" />{s.saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general"><Settings className="w-4 h-4 mr-2" />Geral</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="w-4 h-4 mr-2" />Notificações</TabsTrigger>
          <TabsTrigger value="analysis"><Brain className="w-4 h-4 mr-2" />Análise IA</TabsTrigger>
          <TabsTrigger value="face"><ScanFace className="w-4 h-4 mr-2" />Facial</TabsTrigger>
          <TabsTrigger value="system"><Server className="w-4 h-4 mr-2" />Sistema</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <GeneralSettingsTab settings={s.generalSettings} onChange={s.setGeneralSettings} />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationSettingsTab settings={s.notificationSettings} onChange={s.setNotificationSettings}
            newEmail={s.newEmail} setNewEmail={s.setNewEmail} newPhone={s.newPhone} setNewPhone={s.setNewPhone}
            addEmail={s.addEmail} removeEmail={s.removeEmail} addPhone={s.addPhone} removePhone={s.removePhone} />
        </TabsContent>
        <TabsContent value="analysis">
          <AnalysisSettingsTab settings={s.analysisSettings} onChange={s.setAnalysisSettings} />
        </TabsContent>
        <TabsContent value="face">
          <FaceSettingsTab settings={s.faceSettings} onChange={s.setFaceSettings} />
        </TabsContent>
        <TabsContent value="system">
          <SystemSettingsTab stats={s.systemStats} onClearData={(type) => s.setConfirmClearData(type)}
            generalSettings={s.generalSettings} notificationSettings={s.notificationSettings}
            analysisSettings={s.analysisSettings} faceSettings={s.faceSettings} />
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!s.confirmClearData} onOpenChange={() => s.setConfirmClearData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita. Todos os dados serão permanentemente removidos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground"
              onClick={() => s.confirmClearData && s.handleClearData(s.confirmClearData)}>
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SettingsPage;
