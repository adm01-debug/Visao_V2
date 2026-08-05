import { useEffect, useMemo, useState } from 'react';
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Bell,
  MessageCircle,
  Mail,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Severity = 'low' | 'medium' | 'high' | 'critical';
type Channel = 'email' | 'whatsapp';

interface Recipient {
  id: string;
  name: string;
  email: string | null;
  whatsapp_phone: string | null;
  min_severity: Severity;
  channels: Channel[];
  active: boolean;
}

interface Dispatch {
  id: string;
  alert_id: string;
  recipient_id: string;
  channel: Channel;
  status: 'pending' | 'sent' | 'skipped' | 'failed';
  severity: Severity;
  camera_name: string | null;
  subject: string;
  message: string;
  wa_link: string | null;
  destination: string;
  sent_at: string | null;
  created_at: string;
}

const severityColor: Record<Severity, string> = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-info text-info-foreground',
  high: 'bg-warning text-warning-foreground',
  critical: 'bg-destructive text-destructive-foreground',
};

export default function IncidentNotificationsPage() {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'sent' | 'all'>('pending');

  // form
  const [form, setForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    min_severity: 'medium' as Severity,
    channels: ['email', 'whatsapp'] as Channel[],
  });
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [r, d] = await Promise.all([
      supabase
        .from('notification_recipients')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('notification_dispatches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200),
    ]);
    if (r.data) setRecipients(r.data as Recipient[]);
    if (d.data) setDispatches(d.data as Dispatch[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
    const ch = supabase
      .channel(`incident-dispatches-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notification_dispatches' },
        () => loadAll()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDispatches = useMemo(() => {
    if (statusFilter === 'all') return dispatches;
    return dispatches.filter((d) =>
      statusFilter === 'pending' ? d.status === 'pending' : d.status === 'sent'
    );
  }, [dispatches, statusFilter]);

  const pendingWa = dispatches.filter(
    (d) => d.channel === 'whatsapp' && d.status === 'pending'
  ).length;
  const pendingEmail = dispatches.filter(
    (d) => d.channel === 'email' && d.status === 'pending'
  ).length;

  const handleSave = async () => {
    if (!user) return;
    if (!form.name.trim()) {
      toast.error('Informe o nome do destinatário');
      return;
    }
    if (!form.email && !form.whatsapp) {
      toast.error('Informe email ou WhatsApp');
      return;
    }
    if (form.whatsapp && !/^\+[1-9][0-9]{7,14}$/.test(form.whatsapp)) {
      toast.error('WhatsApp deve estar em formato E.164 (ex: +5511999998888)');
      return;
    }
    setSaving(true);
    const channels: Channel[] = [];
    if (form.email && form.channels.includes('email')) channels.push('email');
    if (form.whatsapp && form.channels.includes('whatsapp')) channels.push('whatsapp');
    const { error } = await supabase.from('notification_recipients').insert({
      user_id: user.id,
      name: form.name.trim(),
      email: form.email || null,
      whatsapp_phone: form.whatsapp || null,
      min_severity: form.min_severity,
      channels,
      active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(`Erro ao salvar: ${error.message}`);
      return;
    }
    toast.success('Destinatário cadastrado');
    setForm({
      name: '',
      email: '',
      whatsapp: '',
      min_severity: 'medium',
      channels: ['email', 'whatsapp'],
    });
    loadAll();
  };

  const toggleActive = async (r: Recipient) => {
    await supabase.from('notification_recipients').update({ active: !r.active }).eq('id', r.id);
    loadAll();
  };

  const removeRecipient = async (id: string) => {
    if (!confirm('Remover este destinatário?')) return;
    await supabase.from('notification_recipients').delete().eq('id', id);
    toast.success('Destinatário removido');
    loadAll();
  };

  const markSent = async (d: Dispatch) => {
    const { error } = await supabase
      .from('notification_dispatches')
      .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: user?.id ?? null })
      .eq('id', d.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Marcado como enviado');
  };

  const openWhatsApp = (d: Dispatch) => {
    if (!d.wa_link) return;
    window.open(d.wa_link, '_blank', 'noopener,noreferrer');
    // marca como enviado após abrir
    setTimeout(() => markSent(d), 800);
  };

  const copyMessage = async (d: Dispatch) => {
    await navigator.clipboard.writeText(d.message);
    toast.success('Mensagem copiada');
  };

  return (
    <PageContent className="container mx-auto px-4 py-6">
      <PageMeta
        title="Notificações de Incidentes"
        description="Envie alertas de incidentes das câmeras por email e WhatsApp com horário e detalhes."
      />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8 text-primary" />
            Notificações de Incidentes
          </h1>
          <p className="text-muted-foreground mt-1">
            Cadastre destinatários e despache alertas por email e WhatsApp com horário e câmera.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1">
            <MessageCircle className="h-3 w-3" /> {pendingWa} WhatsApp pendentes
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Mail className="h-3 w-3" /> {pendingEmail} emails pendentes
          </Badge>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Como funciona</AlertTitle>
        <AlertDescription>
          Cada alerta gerado pelo sistema (incluindo fora de área, atividade noturna e risco de
          arrombamento) cria automaticamente despachos para os destinatários compatíveis. WhatsApp
          abre pelo link <code>wa.me</code> (um clique). Emails ficam prontos assim que o domínio de
          envio for verificado.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="outbox" className="w-full">
        <TabsList>
          <TabsTrigger value="outbox">Central de Envios</TabsTrigger>
          <TabsTrigger value="recipients">Destinatários ({recipients.length})</TabsTrigger>
        </TabsList>

        {/* OUTBOX */}
        <TabsContent value="outbox" className="space-y-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Despachos</CardTitle>
                <CardDescription>Alertas prontos para envio ou já enviados.</CardDescription>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredDispatches.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum despacho{' '}
                  {statusFilter === 'pending'
                    ? 'pendente'
                    : statusFilter === 'sent'
                      ? 'enviado'
                      : ''}
                  .
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredDispatches.map((d) => (
                    <div key={d.id} className="border rounded-lg p-4 space-y-2 bg-card">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={severityColor[d.severity]}>
                            {d.severity.toUpperCase()}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            {d.channel === 'whatsapp' ? (
                              <MessageCircle className="h-3 w-3" />
                            ) : (
                              <Mail className="h-3 w-3" />
                            )}
                            {d.channel}
                          </Badge>
                          {d.status === 'sent' ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3 text-success" /> Enviado
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pendente</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(d.created_at), 'dd/MM/yyyy HH:mm:ss', {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {d.channel === 'whatsapp' && d.status === 'pending' && (
                            <Button size="sm" onClick={() => openWhatsApp(d)}>
                              <Send className="h-4 w-4 mr-1" /> Enviar WhatsApp
                            </Button>
                          )}
                          {d.status === 'pending' && (
                            <Button size="sm" variant="outline" onClick={() => markSent(d)}>
                              <CheckCircle2 className="h-4 w-4 mr-1" /> Marcar enviado
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => copyMessage(d)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-sm font-medium">{d.subject}</div>
                      <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {d.message}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Destino: <span className="font-mono">{d.destination}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECIPIENTS */}
        <TabsContent value="recipients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Novo destinatário</CardTitle>
              <CardDescription>
                Cadastre quem deve receber os alertas. Informe pelo menos email ou WhatsApp.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: João Segurança"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Severidade mínima</Label>
                  <Select
                    value={form.min_severity}
                    onValueChange={(v) => setForm({ ...form, min_severity: v as Severity })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Baixa (tudo)</SelectItem>
                      <SelectItem value="medium">Média (padrão)</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="critical">Crítica apenas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="joao@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp (E.164)</Label>
                  <Input
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="+5511999998888"
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.channels.includes('email')}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        channels: checked
                          ? [...new Set([...form.channels, 'email' as Channel])]
                          : form.channels.filter((c) => c !== 'email'),
                      })
                    }
                  />
                  Enviar por email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.channels.includes('whatsapp')}
                    onCheckedChange={(checked) =>
                      setForm({
                        ...form,
                        channels: checked
                          ? [...new Set([...form.channels, 'whatsapp' as Channel])]
                          : form.channels.filter((c) => c !== 'whatsapp'),
                      })
                    }
                  />
                  Enviar por WhatsApp
                </label>
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Salvar destinatário
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Destinatários ativos</CardTitle>
            </CardHeader>
            <CardContent>
              {recipients.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  Nenhum destinatário cadastrado.
                </p>
              ) : (
                <div className="space-y-2">
                  {recipients.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-4 flex-wrap p-3 border rounded-lg bg-card"
                    >
                      <div className="space-y-1">
                        <div className="font-medium flex items-center gap-2">
                          {r.name}
                          <Badge className={severityColor[r.min_severity]}>
                            ≥ {r.min_severity}
                          </Badge>
                          {!r.active && <Badge variant="outline">Inativo</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                          {r.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {r.email}
                            </span>
                          )}
                          {r.whatsapp_phone && (
                            <span className="flex items-center gap-1">
                              <MessageCircle className="h-3 w-3" /> {r.whatsapp_phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Switch checked={r.active} onCheckedChange={() => toggleActive(r)} />
                          <span className="text-muted-foreground">Ativo</span>
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => removeRecipient(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContent>
  );
}
