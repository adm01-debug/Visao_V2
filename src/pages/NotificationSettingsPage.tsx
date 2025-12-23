import { EmptyState, ErrorState, LoadingSpinner, TimeAgo } from "@/components";
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ArrowLeft, 
  Bell, 
  Mail, 
  Phone, 
  Webhook, 
  Clock, 
  Shield, 
  Plus, 
  X, 
  Save,
  TestTube,
  AlertTriangle,
  AlertCircle,
  Info
} from 'lucide-react';
import { useI18n } from '@/contexts/i18n';
import { useNotificationFlow } from '@/hooks/useNotificationFlow';

interface NotificationConfig {
  id: string;
  name: string;
  enabled: boolean;
  channels: string[];
  email_recipients: string[];
  phone_recipients: string[];
  webhook_urls: string[];
  severity_filter: string[];
  schedule_enabled: boolean;
  schedule_start_time: string | null;
  schedule_end_time: string | null;
  schedule_days: number[] | null;
  cooldown_minutes: number;
}

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Baixa', icon: Info, color: 'bg-blue-500' },
  { value: 'medium', label: 'Média', icon: AlertCircle, color: 'bg-yellow-500' },
  { value: 'high', label: 'Alta', icon: AlertTriangle, color: 'bg-orange-500' },
  { value: 'critical', label: 'Crítica', icon: Shield, color: 'bg-red-500' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const CHANNEL_OPTIONS = [
  { value: 'push', label: 'Push Browser', icon: Bell },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'sms', label: 'SMS/WhatsApp', icon: Phone },
  { value: 'webhook', label: 'Webhook', icon: Webhook },
];

export default function NotificationSettingsPage() {
  const { sendNotification, logs, config, updateConfig } = useNotificationFlow();

  const { t } = useI18n();

  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  
  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newWebhook, setNewWebhook] = useState('');

  useEffect(() => {
    loadConfig();
  }, [user]);

  const loadConfig = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notification_configs')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setConfig(data);
      } else {
        // Create default config
        const defaultConfig: Omit<NotificationConfig, 'id'> & { user_id: string } = {
          user_id: user.id,
          name: 'Configuração Principal',
          enabled: true,
          channels: ['push'],
          email_recipients: [],
          phone_recipients: [],
          webhook_urls: [],
          severity_filter: ['high', 'critical'],
          schedule_enabled: false,
          schedule_start_time: '08:00',
          schedule_end_time: '22:00',
          schedule_days: [1, 2, 3, 4, 5],
          cooldown_minutes: 5,
        };

        const { data: newConfig, error: insertError } = await supabase
          .from('notification_configs')
          .insert(defaultConfig)
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      }
    } catch (error) {
      
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!config || !user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_configs')
        .update({
          name: config.name,
          enabled: config.enabled,
          channels: config.channels,
          email_recipients: config.email_recipients,
          phone_recipients: config.phone_recipients,
          webhook_urls: config.webhook_urls,
          severity_filter: config.severity_filter,
          schedule_enabled: config.schedule_enabled,
          schedule_start_time: config.schedule_start_time,
          schedule_end_time: config.schedule_end_time,
          schedule_days: config.schedule_days,
          cooldown_minutes: config.cooldown_minutes,
        })
        .eq('id', config.id);

      if (error) throw error;
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = (channel: string) => {
    if (!config) return;
    const channels = config.channels.includes(channel)
      ? config.channels.filter(c => c !== channel)
      : [...config.channels, channel];
    setConfig({ ...config, channels });
  };

  const toggleSeverity = (severity: string) => {
    if (!config) return;
    const severities = config.severity_filter.includes(severity)
      ? config.severity_filter.filter(s => s !== severity)
      : [...config.severity_filter, severity];
    setConfig({ ...config, severity_filter: severities });
  };

  const toggleDay = (day: number) => {
    if (!config) return;
    const days = config.schedule_days || [];
    const newDays = days.includes(day)
      ? days.filter(d => d !== day)
      : [...days, day].sort();
    setConfig({ ...config, schedule_days: newDays });
  };

  const addEmail = () => {
    if (!config || !newEmail || !newEmail.includes('@')) {
      toast.error('Digite um email válido');
      return;
    }
    if (config.email_recipients.includes(newEmail)) {
      toast.error('Email já adicionado');
      return;
    }
    setConfig({ ...config, email_recipients: [...config.email_recipients, newEmail] });
    setNewEmail('');
  };

  const removeEmail = (email: string) => {
    if (!config) return;
    setConfig({ ...config, email_recipients: config.email_recipients.filter(e => e !== email) });
  };

  const addPhone = () => {
    if (!config || !newPhone) {
      toast.error('Digite um número válido');
      return;
    }
    if (config.phone_recipients.includes(newPhone)) {
      toast.error('Número já adicionado');
      return;
    }
    setConfig({ ...config, phone_recipients: [...config.phone_recipients, newPhone] });
    setNewPhone('');
  };

  const removePhone = (phone: string) => {
    if (!config) return;
    setConfig({ ...config, phone_recipients: config.phone_recipients.filter(p => p !== phone) });
  };

  const addWebhook = () => {
    if (!config || !newWebhook || !newWebhook.startsWith('http')) {
      toast.error('Digite uma URL válida');
      return;
    }
    if (config.webhook_urls.includes(newWebhook)) {
      toast.error('URL já adicionada');
      return;
    }
    setConfig({ ...config, webhook_urls: [...config.webhook_urls, newWebhook] });
    setNewWebhook('');
  };

  const removeWebhook = (url: string) => {
    if (!config) return;
    setConfig({ ...config, webhook_urls: config.webhook_urls.filter(w => w !== url) });
  };

  const testNotification = async (channel: string) => {
    toast.info(`Testando notificação via ${channel}...`);
    
    try {
      const { error } = await supabase.functions.invoke('send-alert-notification', {
        body: {
          alertId: 'test-' + Date.now(),
          type: 'security',
          severity: 'high',
          message: 'Esta é uma notificação de teste do sistema de vigilância.',
          cameraName: 'Câmera de Teste',
          timestamp: new Date().toISOString(),
          channels: [channel],
          emailRecipients: config?.email_recipients || [],
          phoneRecipients: config?.phone_recipients || [],
          webhookUrls: config?.webhook_urls || [],
        }
      });

      if (error) throw error;
      toast.success(`Notificação de teste enviada via ${channel}`);
    } catch (error) {
      
      toast.error(`Erro ao testar notificação via ${channel}`);
    }
  };

  if (loading) {
    return (
      <div role="main" className="flex items-center justify-center min-h-screen">
        <div role="main" aria-label="Configurações de notificações" className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!config) {
    return (
      <div role="main" className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Erro ao carregar configurações</p>
      </div>
    );
  }

  return (
    <div role="main" aria-label="Configurações de notificações" className="min-h-screen bg-background p-6">
      <div role="main" aria-label="Configurações de notificações" className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div role="main" className="flex items-center justify-between">
          <div role="main" className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
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
            <div role="main" className="flex items-center justify-between">
              <div role="main" className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Notificações Ativas</p>
                  <p className="text-sm text-muted-foreground">Ativar ou desativar todas as notificações</p>
                </div>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(enabled) => setConfig({ ...config, enabled })}
              />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="channels" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="channels">Canais</TabsTrigger>
            <TabsTrigger value="schedule">Horários</TabsTrigger>
            <TabsTrigger value="filters">Filtros</TabsTrigger>
          </TabsList>

          {/* Channels Tab */}
          <TabsContent value="channels" className="space-y-6">
            {/* Channel Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Canais de Notificação</CardTitle>
                <CardDescription>Escolha como deseja receber os alertas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div role="main" aria-label="Configurações de notificações" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {CHANNEL_OPTIONS.map((channel) => {
                    const Icon = channel.icon;
                    const isActive = config.channels.includes(channel.value);
                    return (
                      <button
                        key={channel.value}
                        onClick={() => toggleChannel(channel.value)}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          isActive 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Icon className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-sm font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                          {channel.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Email Recipients */}
            {config.channels.includes('email') && (
              <Card>
                <CardHeader>
                  <div role="main" className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Mail className="h-5 w-5" />
                        Destinatários de Email
                      </CardTitle>
                      <CardDescription>Adicione os emails que receberão os alertas</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => testNotification('email')}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div role="main" className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                    />
                    <Button onClick={addEmail}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div role="main" className="flex flex-wrap gap-2">
                    {config.email_recipients.map((email) => (
                      <Badge key={email} variant="secondary" className="gap-1">
                        {email}
                        <button onClick={() => removeEmail(email)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Phone Recipients */}
            {config.channels.includes('sms') && (
              <Card>
                <CardHeader>
                  <div role="main" className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Números de Telefone
                      </CardTitle>
                      <CardDescription>Adicione números para SMS/WhatsApp</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => testNotification('whatsapp')}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div role="main" className="flex gap-2">
                    <Input
                      type="tel"
                      placeholder="+55 11 99999-9999"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPhone()}
                    />
                    <Button onClick={addPhone}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div role="main" className="flex flex-wrap gap-2">
                    {config.phone_recipients.map((phone) => (
                      <Badge key={phone} variant="secondary" className="gap-1">
                        {phone}
                        <button onClick={() => removePhone(phone)}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Webhook URLs */}
            {config.channels.includes('webhook') && (
              <Card>
                <CardHeader>
                  <div role="main" className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Webhook className="h-5 w-5" />
                        URLs de Webhook
                      </CardTitle>
                      <CardDescription>Integre com sistemas externos via webhook</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => testNotification('webhook')}>
                      <TestTube className="h-4 w-4 mr-2" />
                      Testar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div role="main" className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://api.exemplo.com/webhook"
                      value={newWebhook}
                      onChange={(e) => setNewWebhook(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addWebhook()}
                    />
                    <Button onClick={addWebhook}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div role="main" aria-label="Configurações de notificações" className="space-y-2">
                    {config.webhook_urls.map((url) => (
                      <div key={url} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                        <span className="text-sm truncate flex-1">{url}</span>
                        <button onClick={() => removeWebhook(url)} className="ml-2 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Agendamento
                </CardTitle>
                <CardDescription>Configure horários específicos para receber notificações</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div role="main" className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Ativar Agendamento</p>
                    <p className="text-sm text-muted-foreground">Receber notificações apenas em horários específicos</p>
                  </div>
                  <Switch
                    checked={config.schedule_enabled}
                    onCheckedChange={(schedule_enabled) => setConfig({ ...config, schedule_enabled })}
                  />
                </div>

                {config.schedule_enabled && (
                  <>
                    <div role="main" aria-label="Configurações de notificações" className="grid grid-cols-2 gap-4">
                      <div role="main" aria-label="Configurações de notificações" className="space-y-2">
                        <Label>Horário de Início</Label>
                        <Input
                          type="time"
                          value={config.schedule_start_time || '08:00'}
                          onChange={(e) => setConfig({ ...config, schedule_start_time: e.target.value })}
                        />
                      </div>
                      <div role="main" aria-label="Configurações de notificações" className="space-y-2">
                        <Label>Horário de Fim</Label>
                        <Input
                          type="time"
                          value={config.schedule_end_time || '22:00'}
                          onChange={(e) => setConfig({ ...config, schedule_end_time: e.target.value })}
                        />
                      </div>
                    </div>

                    <div role="main" aria-label="Configurações de notificações" className="space-y-2">
                      <Label>Dias da Semana</Label>
                      <div role="main" className="flex gap-2">
                        {DAYS_OF_WEEK.map((day) => {
                          const isActive = config.schedule_days?.includes(day.value);
                          return (
                            <button
                              key={day.value}
                              onClick={() => toggleDay(day.value)}
                              className={`w-12 h-12 rounded-lg font-medium transition-all ${
                                isActive
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                <div role="main" aria-label="Configurações de notificações" className="space-y-4">
                  <div>
                    <Label>Intervalo entre Notificações (minutos)</Label>
                    <p className="text-sm text-muted-foreground mb-4">
                      Tempo mínimo entre notificações para evitar spam
                    </p>
                  </div>
                  <div role="main" className="flex items-center gap-4">
                    <Slider
                      value={[config.cooldown_minutes]}
                      onValueChange={([value]) => setConfig({ ...config, cooldown_minutes: value })}
                      min={1}
                      max={60}
                      step={1}
                      className="flex-1"
                    />
                    <span className="w-16 text-center font-medium">{config.cooldown_minutes} min</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Filters Tab */}
          <TabsContent value="filters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Filtros de Severidade
                </CardTitle>
                <CardDescription>Escolha quais tipos de alertas deseja receber</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div role="main" aria-label="Configurações de notificações" className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {SEVERITY_OPTIONS.map((severity) => {
                    const Icon = severity.icon;
                    const isActive = config.severity_filter.includes(severity.value);
                    return (
                      <button
                        key={severity.value}
                        onClick={() => toggleSeverity(severity.value)}
                        className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                          isActive 
                            ? 'border-primary bg-primary/10' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className={`p-2 rounded-full ${severity.color}`}>
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {severity.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-sm text-muted-foreground text-center mt-4">
                  {config.severity_filter.length === 0 
                    ? 'Nenhum filtro selecionado - você não receberá notificações'
                    : `Você receberá notificações de severidade: ${config.severity_filter.join(', ')}`
                  }
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
