import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Bell, Save } from 'lucide-react';
import { NotificationSettingsPanel } from '@/components/settings/NotificationSettingsPanel';
import { useNotificationConfig } from '@/components/notification-settings/useNotificationConfig';
import { ChannelsTab } from '@/components/notification-settings/ChannelsTab';
import { ScheduleTab } from '@/components/notification-settings/ScheduleTab';
import { FiltersTab } from '@/components/notification-settings/FiltersTab';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';

export default function NotificationSettingsPage() {
  const navigate = useNavigate();
  const {
    config, loading, saving, saveConfig, updateConfig,
    toggleChannel, toggleSeverity, toggleDay, testNotification,
  } = useNotificationConfig();

  if (loading) {
    return (
      <PageContent className="flex items-center justify-center min-h-[50vh]">
        <PageMeta title="Configurações de Notificações" description="Gerencie canais e regras de notificação" />
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </PageContent>
    );
  }

  if (!config) {
    return (
      <PageContent className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() = aria-label="Voltar"> navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Configurações de Notificação</h1>
              <p className="text-muted-foreground">Gerencie como e quando receber alertas</p>
            </div>
          </div>
          <Button onClick={saveConfig} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        {/* Master Toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Notificações Ativas</p>
                  <p className="text-sm text-muted-foreground">Ativar ou desativar todas as notificações</p>
                </div>
              </div>
              <Switch checked={config.enabled}
                onCheckedChange={(enabled) => updateConfig({ enabled })} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="realtime" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="realtime">Tempo Real</TabsTrigger>
            <TabsTrigger value="channels">Canais</TabsTrigger>
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="filters">Filtros</TabsTrigger>
          </TabsList>

          <TabsContent value="realtime" className="space-y-6">
            <NotificationSettingsPanel />
          </TabsContent>

          <TabsContent value="channels" className="space-y-6">
            <ChannelsTab config={config} onUpdate={updateConfig}
              onToggleChannel={toggleChannel} onTest={testNotification} />
          </TabsContent>

          <TabsContent value="schedule" className="space-y-6">
            <ScheduleTab config={config} onUpdate={updateConfig} onToggleDay={toggleDay} />
          </TabsContent>

          <TabsContent value="filters" className="space-y-6">
            <FiltersTab config={config} onToggleSeverity={toggleSeverity} />
          </TabsContent>
        </Tabs>
      </div>
    </PageContent>
  );
}
