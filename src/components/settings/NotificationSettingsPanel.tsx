/**
 * Painel de configurações de notificações push
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bell, BellOff, Volume2, VolumeX, TestTube, Smartphone, AlertTriangle, Info } from "lucide-react";
import { useRealtimeAlertNotifications } from "@/hooks/useRealtimeAlertNotifications";
import { isNotificationSupported } from "@/lib/browserNotifications";
import { toast } from "sonner";

export function NotificationSettingsPanel() {
  const {
    pushPermission,
    isPushEnabled,
    togglePush,
    toggleSound,
    isSoundEnabled,
    requestPushPermission,
    sendTestPush,
    sendTestSound,
  } = useRealtimeAlertNotifications();

  const [soundEnabled, setSoundEnabled] = useState(isSoundEnabled());
  const isSupported = isNotificationSupported();

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    toggleSound(enabled);
    toast.success(enabled ? "Som de alertas ativado" : "Som de alertas desativado");
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled && pushPermission !== "granted") {
      const permission = await requestPushPermission();
      if (permission !== "granted") {
        toast.error("Permissão negada. Habilite nas configurações do navegador.");
        return;
      }
    }
    togglePush(enabled);
    toast.success(enabled ? "Notificações push ativadas" : "Notificações push desativadas");
  };

  const handleRequestPermission = async () => {
    const permission = await requestPushPermission();
    if (permission === "granted") {
      toast.success("Permissão concedida! Notificações push ativadas.");
    } else if (permission === "denied") {
      toast.error("Permissão negada. Verifique as configurações do seu navegador.");
    }
  };

  const getPermissionBadge = () => {
    switch (pushPermission) {
      case "granted":
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Permitido</Badge>;
      case "denied":
        return <Badge variant="destructive">Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">Não solicitado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notificações em Tempo Real
        </CardTitle>
        <CardDescription>
          Configure como você deseja receber alertas do sistema
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Notificações Push
              </Label>
              <p className="text-sm text-muted-foreground">
                Receba alertas mesmo quando o navegador estiver em segundo plano
              </p>
            </div>
            <div className="flex items-center gap-2">
              {getPermissionBadge()}
              <Switch
                checked={isPushEnabled && pushPermission === "granted"}
                onCheckedChange={handlePushToggle}
                disabled={!isSupported || pushPermission === "denied"}
              />
            </div>
          </div>

          {!isSupported && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-yellow-500">
                Seu navegador não suporta notificações push
              </span>
            </div>
          )}

          {pushPermission === "denied" && isSupported && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <BellOff className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-500">
                Notificações bloqueadas. Altere nas configurações do navegador.
              </span>
            </div>
          )}

          {pushPermission === "default" && isSupported && (
            <Button
              variant="outline"
              onClick={handleRequestPermission}
              className="w-full"
            >
              <Bell className="h-4 w-4 mr-2" />
              Solicitar Permissão de Notificações
            </Button>
          )}
        </div>

        <Separator />

        {/* Sound Alerts Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                Sons de Alerta
              </Label>
              <p className="text-sm text-muted-foreground">
                Reproduz som quando alertas críticos ou altos chegam
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={handleSoundToggle}
            />
          </div>
        </div>

        <Separator />

        {/* Severity Info */}
        <div className="space-y-3">
          <Label className="text-base">Níveis de Severidade</Label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
              <span className="text-red-500">🚨</span>
              <span className="text-muted-foreground">Crítico - Push + Som forte</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg">
              <span className="text-orange-500">⚠️</span>
              <span className="text-muted-foreground">Alto - Push + Som</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-500/10 rounded-lg">
              <span className="text-yellow-500">📢</span>
              <span className="text-muted-foreground">Médio - Apenas toast</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
              <span className="text-blue-500">ℹ️</span>
              <span className="text-muted-foreground">Baixo - Apenas toast</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Test Section */}
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Testar Notificações
          </Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={sendTestPush}
              disabled={pushPermission !== "granted" || !isPushEnabled}
              className="flex-1"
            >
              <Bell className="h-4 w-4 mr-2" />
              Testar Push
            </Button>
            <Button
              variant="outline"
              onClick={sendTestSound}
              disabled={!soundEnabled}
              className="flex-1"
            >
              <Volume2 className="h-4 w-4 mr-2" />
              Testar Som
            </Button>
          </div>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            As notificações push funcionam em tempo real através do Supabase Realtime. 
            Alertas críticos requerem interação para serem descartados.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default NotificationSettingsPanel;
