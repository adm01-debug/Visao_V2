import { useLocalStorage } from "@/hooks";
import { EmptyState, ErrorState, LoadingSpinner, StatusBadge, SeverityBadge, TimeAgo, ConfirmDialog } from "@/components";
/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Página: Configurações (Completa)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Bell,
  Brain,
  ScanFace,
  Shield,
  Database,
  RefreshCw,
  Save,
  Mail,
  MessageSquare,
  Webhook,
  Clock,
  Camera,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Moon,
  Sun,
  Monitor,
  Volume2,
  VolumeX,
  Trash2,
  Download,
  Upload,
  Key,
  User,
  Users,
  Activity,
  Zap,
  Eye,
  EyeOff,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Server,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useI18n } from '@/contexts/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

interface GeneralSettings {
  systemName: string;
  timezone: string;
  language: string;
  theme: 'light' | 'dark' | 'system';
  soundEnabled: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
}

interface NotificationSettings {
  emailEnabled: boolean;
  emailRecipients: string[];
  whatsappEnabled: boolean;
  whatsappNumbers: string[];
  webhookEnabled: boolean;
  webhookUrl: string;
  severityFilter: string[];
  cooldownMinutes: number;
  scheduleEnabled: boolean;
  scheduleStart: string;
  scheduleEnd: string;
  scheduleDays: number[];
}

interface AnalysisSettings {
  analysisEnabled: boolean;
  defaultInterval: number;
  defaultTypes: string[];
  saveHistory: boolean;
  maxHistoryDays: number;
  createAlerts: boolean;
  minConfidence: number;
}

interface FaceRecognitionSettings {
  enabled: boolean;
  matchThreshold: number;
  minFaceQuality: number;
  minFaceSize: number;
  detectMultipleFaces: boolean;
  maxFacesPerFrame: number;
  alertOnUnknown: boolean;
  saveUnknownFaces: boolean;
  alertCooldown: number;
}

interface SystemStats {
  totalCameras: number;
  onlineCameras: number;
  totalAlerts: number;
  totalPersons: number;
  totalZones: number;
  storageUsed: number;
  storageTotal: number;
  dbSize: string;
  lastBackup?: string;
  uptime: string;
}

// ============================================
// COMPONENTES AUXILIARES
// ============================================

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: unknown;
  children: React.ReactNode;
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingRow({ label, description, children }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

export function SettingsPage() {
  const { settings, updateSettings, resetSettings, loading: settingsLoading } = useSettings();

  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [confirmClearData, setConfirmClearData] = useState<string | null>(null);

  // Settings state
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    systemName: 'VISÃO',
    timezone: 'America/Sao_Paulo',
    language: 'pt-BR',
    theme: 'dark',
    soundEnabled: true,
    autoRefresh: true,
    refreshInterval: 30000,
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    emailRecipients: [],
    whatsappEnabled: false,
    whatsappNumbers: [],
    webhookEnabled: false,
    webhookUrl: '',
    severityFilter: ['high', 'critical'],
    cooldownMinutes: 5,
    scheduleEnabled: false,
    scheduleStart: '08:00',
    scheduleEnd: '22:00',
    scheduleDays: [1, 2, 3, 4, 5],
  });

  const [analysisSettings, setAnalysisSettings] = useState<AnalysisSettings>({
    analysisEnabled: true,
    defaultInterval: 5000,
    defaultTypes: ['security'],
    saveHistory: true,
    maxHistoryDays: 30,
    createAlerts: true,
    minConfidence: 0.7,
  });

  const [faceSettings, setFaceSettings] = useState<FaceRecognitionSettings>({
    enabled: true,
    matchThreshold: 0.6,
    minFaceQuality: 0.5,
    minFaceSize: 80,
    detectMultipleFaces: true,
    maxFacesPerFrame: 10,
    alertOnUnknown: false,
    saveUnknownFaces: true,
    alertCooldown: 60,
  });

  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalCameras: 0,
    onlineCameras: 0,
    totalAlerts: 0,
    totalPersons: 0,
    totalZones: 0,
    storageUsed: 0,
    storageTotal: 100,
    dbSize: '0 MB',
    uptime: '0h',
  });

  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Load settings
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Load notification config
      const { data: notifConfig } = await supabase
        .from('notification_configs')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (notifConfig) {
        setNotificationSettings(prev => ({
          ...prev,
          emailEnabled: notifConfig.channels?.includes('email') || false,
          emailRecipients: notifConfig.email_recipients || [],
          whatsappEnabled: notifConfig.channels?.includes('whatsapp') || false,
          whatsappNumbers: notifConfig.phone_recipients || [],
          webhookEnabled: notifConfig.channels?.includes('webhook') || false,
          webhookUrl: notifConfig.webhook_urls?.[0] || '',
          severityFilter: notifConfig.severity_filter || ['high', 'critical'],
          cooldownMinutes: notifConfig.cooldown_minutes || 5,
          scheduleEnabled: notifConfig.schedule_enabled || false,
          scheduleStart: notifConfig.schedule_start_time || '08:00',
          scheduleEnd: notifConfig.schedule_end_time || '22:00',
          scheduleDays: notifConfig.schedule_days || [1, 2, 3, 4, 5],
        }));
      }

      // Load face recognition config
      const { data: faceConfig } = await supabase
        .from('face_recognition_configs')
        .select('*')
        .is('camera_id', null)
        .maybeSingle();

      if (faceConfig) {
        setFaceSettings(prev => ({
          ...prev,
          enabled: faceConfig.enabled,
          matchThreshold: faceConfig.match_threshold || 0.6,
          minFaceQuality: faceConfig.min_face_quality || 0.5,
          minFaceSize: faceConfig.min_face_size || 80,
          detectMultipleFaces: faceConfig.detect_multiple_faces ?? true,
          maxFacesPerFrame: faceConfig.max_faces_per_frame || 10,
          alertOnUnknown: faceConfig.alert_on_unknown || false,
          saveUnknownFaces: faceConfig.save_unknown_faces ?? true,
          alertCooldown: faceConfig.alert_cooldown || 60,
        }));
      }

      // Load stats
      const [camerasRes, alertsRes, personsRes, zonesRes] = await Promise.all([
        supabase.from('cameras').select('id, status', { count: 'exact' }),
        supabase.from('alerts').select('id', { count: 'exact' }),
        supabase.from('registered_persons').select('id', { count: 'exact' }),
        supabase.from('zones').select('id', { count: 'exact' }),
      ]);

      setSystemStats({
        totalCameras: camerasRes.count || 0,
        onlineCameras: camerasRes.data?.filter(c => c.status !== 'offline').length || 0,
        totalAlerts: alertsRes.count || 0,
        totalPersons: personsRes.count || 0,
        totalZones: zonesRes.count || 0,
        storageUsed: 45,
        storageTotal: 100,
        dbSize: '128 MB',
        uptime: '7d 4h 32m',
      });

      // Load from localStorage
      const savedGeneral = localStorage.getItem('visao-general-settings');
      if (savedGeneral) {
        setGeneralSettings(JSON.parse(savedGeneral));
      }

      const savedAnalysis = localStorage.getItem('visao-analysis-settings');
      if (savedAnalysis) {
        setAnalysisSettings(JSON.parse(savedAnalysis));
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // Save settings
  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado');
        setSaving(false);
        return;
      }

      // Save notification settings
      const channels = [];
      if (notificationSettings.emailEnabled) channels.push('email');
      if (notificationSettings.whatsappEnabled) channels.push('whatsapp');
      if (notificationSettings.webhookEnabled) channels.push('webhook');

      await supabase.from('notification_configs').upsert({
        user_id: user.id,
        name: 'Configuração Principal',
        enabled: channels.length > 0,
        channels,
        email_recipients: notificationSettings.emailRecipients,
        phone_recipients: notificationSettings.whatsappNumbers,
        webhook_urls: notificationSettings.webhookUrl ? [notificationSettings.webhookUrl] : [],
        severity_filter: notificationSettings.severityFilter,
        cooldown_minutes: notificationSettings.cooldownMinutes,
        schedule_enabled: notificationSettings.scheduleEnabled,
        schedule_start_time: notificationSettings.scheduleStart,
        schedule_end_time: notificationSettings.scheduleEnd,
        schedule_days: notificationSettings.scheduleDays,
      });

      // Save face recognition settings
      await supabase.from('face_recognition_configs').upsert({
        user_id: user.id,
        camera_id: null,
        enabled: faceSettings.enabled,
        match_threshold: faceSettings.matchThreshold,
        min_face_quality: faceSettings.minFaceQuality,
        min_face_size: faceSettings.minFaceSize,
        detect_multiple_faces: faceSettings.detectMultipleFaces,
        max_faces_per_frame: faceSettings.maxFacesPerFrame,
        alert_on_unknown: faceSettings.alertOnUnknown,
        save_unknown_faces: faceSettings.saveUnknownFaces,
        alert_cooldown: faceSettings.alertCooldown,
      });

      // Save to localStorage
      localStorage.setItem('visao-general-settings', JSON.stringify(generalSettings));
      localStorage.setItem('visao-analysis-settings', JSON.stringify(analysisSettings));

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  // Email handlers
  const addEmail = () => {
    if (newEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      if (!notificationSettings.emailRecipients.includes(newEmail)) {
        setNotificationSettings(prev => ({
          ...prev,
          emailRecipients: [...prev.emailRecipients, newEmail],
        }));
      }
      setNewEmail('');
    } else {
      toast.error('E-mail inválido');
    }
  };

  const removeEmail = (email: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      emailRecipients: prev.emailRecipients.filter(e => e !== email),
    }));
  };

  // Phone handlers
  const addPhone = () => {
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      if (!notificationSettings.whatsappNumbers.includes(cleanPhone)) {
        setNotificationSettings(prev => ({
          ...prev,
          whatsappNumbers: [...prev.whatsappNumbers, cleanPhone],
        }));
      }
      setNewPhone('');
    } else {
      toast.error('Telefone inválido');
    }
  };

  const removePhone = (phone: string) => {
    setNotificationSettings(prev => ({
      ...prev,
      whatsappNumbers: prev.whatsappNumbers.filter(p => p !== phone),
    }));
  };

  // Clear data handlers
  const handleClearData = async (type: string) => {
    try {
      switch (type) {
        case 'alerts':
          await supabase.from('alerts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          toast.success('Alertas limpos');
          break;
        case 'history':
          await supabase.from('analysis_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          await supabase.from('recognition_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          toast.success('Histórico limpo');
          break;
        case 'zones':
          await supabase.from('zone_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
          toast.success('Eventos de zonas limpos');
          break;
      }
      loadSettings();
    } catch (error) {
      toast.error('Erro ao limpar dados');
    }
    setConfirmClearData(null);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
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
            <Settings className="w-6 h-6" />
            Configurações
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button aria-label="Ação" variant="outline" onClick={loadSettings}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Recarregar
          </Button>
          <Button aria-label="Ação" onClick={saveSettings} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? {t('settings.saving', 'Salvando...')} : {t('settings.save', 'Salvar')}}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">
            <Settings className="w-4 h-4 mr-2" />
            Geral
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="analysis">
            <Brain className="w-4 h-4 mr-2" />
            Análise IA
          </TabsTrigger>
          <TabsTrigger value="face">
            <ScanFace className="w-4 h-4 mr-2" />
            Facial
          </TabsTrigger>
          <TabsTrigger value="system">
            <Server className="w-4 h-4 mr-2" />
            Sistema
          </TabsTrigger>
        </TabsList>

        {/* ==================== GENERAL ==================== */}
        <TabsContent value="general" className="space-y-6 mt-6">
          <SettingsSection
            title="Preferências Gerais"
            description="Configurações básicas do sistema"
            icon={Settings}
          >
            <SettingRow label="Nome do Sistema" description="Nome exibido no cabeçalho">
              <Input
                value={generalSettings.systemName}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, systemName: e.target.value }))}
                className="w-48"
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Tema" description="Aparência visual">
              <Select
                value={generalSettings.theme}
                onValueChange={(v) => setGeneralSettings(prev => ({ ...prev, theme: v as unknown }))}
              >
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <span className="flex items-center gap-2"><Sun className="w-4 h-4" /> Claro</span>
                  </SelectItem>
                  <SelectItem value="dark">
                    <span className="flex items-center gap-2"><Moon className="w-4 h-4" /> Escuro</span>
                  </SelectItem>
                  <SelectItem value="system">
                    <span className="flex items-center gap-2"><Monitor className="w-4 h-4" /> Sistema</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow label="Sons de Alerta" description="Reproduzir som ao receber alertas">
              <Switch
                checked={generalSettings.soundEnabled}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, soundEnabled: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Atualização Automática" description="Recarregar dados periodicamente">
              <Switch
                checked={generalSettings.autoRefresh}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, autoRefresh: checked }))}
              />
            </SettingRow>

            {generalSettings.autoRefresh && (
              <SettingRow
                label="Intervalo"
                description={`A cada ${generalSettings.refreshInterval / 1000}s`}
              >
                <Select
                  value={String(generalSettings.refreshInterval)}
                  onValueChange={(v) => setGeneralSettings(prev => ({ ...prev, refreshInterval: Number(v) }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10000">10s</SelectItem>
                    <SelectItem value="30000">30s</SelectItem>
                    <SelectItem value="60000">1min</SelectItem>
                    <SelectItem value="300000">5min</SelectItem>
                  </SelectContent>
                </Select>
              </SettingRow>
            )}
          </SettingsSection>
        </TabsContent>

        {/* ==================== NOTIFICATIONS ==================== */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <SettingsSection
            title="E-mail"
            description="Alertas por e-mail"
            icon={Mail}
          >
            <SettingRow label="Ativar E-mail">
              <Switch
                checked={notificationSettings.emailEnabled}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailEnabled: checked }))}
              />
            </SettingRow>

            {notificationSettings.emailEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Destinatários</Label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addEmail()}
                    />
                    <Button aria-label="Ação" onClick={addEmail} variant="secondary">Adicionar</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notificationSettings.emailRecipients.map(email => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button onClick={() => removeEmail(email)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection
            title="WhatsApp"
            description="Alertas por WhatsApp"
            icon={MessageSquare}
          >
            <SettingRow label="Ativar WhatsApp">
              <Switch
                checked={notificationSettings.whatsappEnabled}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, whatsappEnabled: checked }))}
              />
            </SettingRow>

            {notificationSettings.whatsappEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Números</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="5511999999999"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addPhone()}
                    />
                    <Button aria-label="Ação" onClick={addPhone} variant="secondary">Adicionar</Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {notificationSettings.whatsappNumbers.map(phone => (
                      <Badge key={phone} variant="secondary" className="gap-1">
                        {phone}
                        <button onClick={() => removePhone(phone)} className="ml-1 hover:text-destructive">×</button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection
            title="Webhook"
            description="Integração via webhook"
            icon={Webhook}
          >
            <SettingRow label="Ativar Webhook">
              <Switch
                checked={notificationSettings.webhookEnabled}
                onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, webhookEnabled: checked }))}
              />
            </SettingRow>

            {notificationSettings.webhookEnabled && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <Input
                    placeholder="https://..."
                    value={notificationSettings.webhookUrl}
                    onChange={(e) => setNotificationSettings(prev => ({ ...prev, webhookUrl: e.target.value }))}
                  />
                </div>
              </>
            )}
          </SettingsSection>

          <SettingsSection
            title="Filtros"
            description="Controle de envio"
            icon={Clock}
          >
            <SettingRow label="Severidade" description="Notificar apenas">
              <div className="flex gap-1">
                {['low', 'medium', 'high', 'critical'].map(sev => (
                  <Badge
                    key={sev}
                    variant={notificationSettings.severityFilter.includes(sev) ? 'default' : 'outline'}
                    className="cursor-pointer text-xs"
                    onClick={() => {
                      setNotificationSettings(prev => ({
                        ...prev,
                        severityFilter: prev.severityFilter.includes(sev)
                          ? prev.severityFilter.filter(s => s !== sev)
                          : [...prev.severityFilter, sev],
                      }));
                    }}
                  >
                    {sev}
                  </Badge>
                ))}
              </div>
            </SettingRow>

            <Separator />

            <SettingRow label="Cooldown" description="Intervalo mínimo">
              <Select
                value={String(notificationSettings.cooldownMinutes)}
                onValueChange={(v) => setNotificationSettings(prev => ({ ...prev, cooldownMinutes: Number(v) }))}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 min</SelectItem>
                  <SelectItem value="5">5 min</SelectItem>
                  <SelectItem value="15">15 min</SelectItem>
                  <SelectItem value="30">30 min</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
          </SettingsSection>
        </TabsContent>

        {/* ==================== ANALYSIS ==================== */}
        <TabsContent value="analysis" className="space-y-6 mt-6">
          <SettingsSection
            title="Análise por IA"
            description="Análise automática de vídeo"
            icon={Brain}
          >
            <SettingRow label="Análise Contínua" description="Ativar análise automática">
              <Switch
                checked={analysisSettings.analysisEnabled}
                onCheckedChange={(checked) => setAnalysisSettings(prev => ({ ...prev, analysisEnabled: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Intervalo" description={`A cada ${analysisSettings.defaultInterval / 1000}s`}>
              <Select
                value={String(analysisSettings.defaultInterval)}
                onValueChange={(v) => setAnalysisSettings(prev => ({ ...prev, defaultInterval: Number(v) }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3000">3s</SelectItem>
                  <SelectItem value="5000">5s</SelectItem>
                  <SelectItem value="10000">10s</SelectItem>
                  <SelectItem value="30000">30s</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>

            <Separator />

            <SettingRow
              label="Confiança Mínima"
              description={`≥ ${Math.round(analysisSettings.minConfidence * 100)}%`}
            >
              <div className="w-40 flex items-center gap-2">
                <Slider
                  value={[analysisSettings.minConfidence * 100]}
                  onValueChange={([v]) => setAnalysisSettings(prev => ({ ...prev, minConfidence: v / 100 }))}
                  min={30}
                  max={95}
                  step={5}
                />
                <span className="text-xs w-10">{Math.round(analysisSettings.minConfidence * 100)}%</span>
              </div>
            </SettingRow>

            <Separator />

            <SettingRow label="Salvar Histórico">
              <Switch
                checked={analysisSettings.saveHistory}
                onCheckedChange={(checked) => setAnalysisSettings(prev => ({ ...prev, saveHistory: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Criar Alertas" description="Gerar alertas automaticamente">
              <Switch
                checked={analysisSettings.createAlerts}
                onCheckedChange={(checked) => setAnalysisSettings(prev => ({ ...prev, createAlerts: checked }))}
              />
            </SettingRow>
          </SettingsSection>
        </TabsContent>

        {/* ==================== FACE RECOGNITION ==================== */}
        <TabsContent value="face" className="space-y-6 mt-6">
          <SettingsSection
            title="Reconhecimento Facial"
            description="Detecção e identificação de rostos"
            icon={ScanFace}
          >
            <SettingRow label="Ativar" description="Detecção de rostos">
              <Switch
                checked={faceSettings.enabled}
                onCheckedChange={(checked) => setFaceSettings(prev => ({ ...prev, enabled: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow
              label="Limiar de Match"
              description={`≥ ${Math.round(faceSettings.matchThreshold * 100)}%`}
            >
              <div className="w-40 flex items-center gap-2">
                <Slider
                  value={[faceSettings.matchThreshold * 100]}
                  onValueChange={([v]) => setFaceSettings(prev => ({ ...prev, matchThreshold: v / 100 }))}
                  min={40}
                  max={90}
                  step={5}
                />
                <span className="text-xs w-10">{Math.round(faceSettings.matchThreshold * 100)}%</span>
              </div>
            </SettingRow>

            <Separator />

            <SettingRow
              label="Qualidade Mínima"
              description={`≥ ${Math.round(faceSettings.minFaceQuality * 100)}%`}
            >
              <div className="w-40 flex items-center gap-2">
                <Slider
                  value={[faceSettings.minFaceQuality * 100]}
                  onValueChange={([v]) => setFaceSettings(prev => ({ ...prev, minFaceQuality: v / 100 }))}
                  min={20}
                  max={80}
                  step={5}
                />
                <span className="text-xs w-10">{Math.round(faceSettings.minFaceQuality * 100)}%</span>
              </div>
            </SettingRow>

            <Separator />

            <SettingRow label="Múltiplos Rostos" description="Detectar vários rostos por frame">
              <Switch
                checked={faceSettings.detectMultipleFaces}
                onCheckedChange={(checked) => setFaceSettings(prev => ({ ...prev, detectMultipleFaces: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Alertar Desconhecidos" description="Alerta para rostos não cadastrados">
              <Switch
                checked={faceSettings.alertOnUnknown}
                onCheckedChange={(checked) => setFaceSettings(prev => ({ ...prev, alertOnUnknown: checked }))}
              />
            </SettingRow>

            <Separator />

            <SettingRow label="Salvar Desconhecidos" description="Armazenar rostos não identificados">
              <Switch
                checked={faceSettings.saveUnknownFaces}
                onCheckedChange={(checked) => setFaceSettings(prev => ({ ...prev, saveUnknownFaces: checked }))}
              />
            </SettingRow>
          </SettingsSection>
        </TabsContent>

        {/* ==================== SYSTEM ==================== */}
        <TabsContent value="system" className="space-y-6 mt-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Câmeras</p>
                    <p className="text-lg font-bold">{systemStats.onlineCameras}/{systemStats.totalCameras}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Alertas</p>
                    <p className="text-lg font-bold">{systemStats.totalAlerts}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Pessoas</p>
                    <p className="text-lg font-bold">{systemStats.totalPersons}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-xs text-muted-foreground">Zonas</p>
                    <p className="text-lg font-bold">{systemStats.totalZones}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <SettingsSection
            title="Armazenamento"
            description="Uso de disco e banco de dados"
            icon={HardDrive}
          >
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Espaço Utilizado</span>
                  <span>{systemStats.storageUsed}% de {systemStats.storageTotal} GB</span>
                </div>
                <Progress value={systemStats.storageUsed} className="h-2" />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Tamanho do Banco</span>
                <span className="font-medium">{systemStats.dbSize}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Uptime</span>
                <span className="font-medium">{systemStats.uptime}</span>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Manutenção"
            description="Limpeza de dados"
            icon={Trash2}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Limpar Alertas</p>
                  <p className="text-xs text-muted-foreground">Remove todos os alertas</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearData('alerts')}
                >
                  Limpar
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Limpar Histórico</p>
                  <p className="text-xs text-muted-foreground">Análises e reconhecimentos</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearData('history')}
                >
                  Limpar
                </Button>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Limpar Eventos de Zonas</p>
                  <p className="text-xs text-muted-foreground">Contagens e eventos</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmClearData('zones')}
                >
                  Limpar
                </Button>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Backup & Exportação"
            description="Exportar configurações"
            icon={Download}
          >
            <div className="flex items-center gap-2">
              <Button aria-label="Ação" variant="outline" onClick={() => {
                const data = {
                  general: generalSettings,
                  notifications: notificationSettings,
                  analysis: analysisSettings,
                  face: faceSettings,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `visao-config-${format(new Date(), 'yyyy-MM-dd')}.json`;
                a.click();
                toast.success('Configurações exportadas');
              }}>
                <Download className="w-4 h-4 mr-2" />
                Exportar Config
              </Button>
            </div>
          </SettingsSection>
        </TabsContent>
      </Tabs>

      {/* Confirm Clear Dialog */}
      <AlertDialog open={!!confirmClearData} onOpenChange={() => setConfirmClearData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados serão permanentemente removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => confirmClearData && handleClearData(confirmClearData)}
            >
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SettingsPage;
