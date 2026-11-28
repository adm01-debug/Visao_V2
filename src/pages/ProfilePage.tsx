/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Profile Page - Com upload de avatar
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Camera, Bell, Save, Loader2, Upload, Trash2, ImagePlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { PageMeta } from '@/components/PageMeta';
import { PageContent } from '@/components/layout/MainLayout';
import { AccountDeletionCard } from '@/components/security';

export default function ProfilePage() {
  const _navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadAvatar, removeAvatar, avatarUrl, setAvatarUrl } = useAvatarUpload();

  const [isLoading, setIsLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      const { data, error: _error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setFullName(data.full_name || '');
        setAvatarUrl(data.avatar_url);
      }
    }

    loadProfile();
  }, [user, setAvatarUrl]);

  const handleSave = async () => {
    if (!user) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      logger.error(
        'profile',
        'Error saving profile:',
        error instanceof Error ? error.message : String(error)
      );
      toast.error('Erro ao salvar perfil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadAvatar(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    await removeAvatar();
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <PageContent maxWidth="md" className="animate-fade-in">
      <PageMeta title="Perfil" description="Gerencie seu perfil e informações pessoais" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie suas informações pessoais e preferências
          </p>
        </div>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="relative inline-block mx-auto group">
              <Avatar className="h-24 w-24 mx-auto ring-4 ring-background shadow-lg">
                <AvatarImage
                  src={avatarUrl || '/placeholder.svg'}
                  alt="Foto do perfil"
                  className="object-cover"
                />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {fullName?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>

              {/* Overlay on hover */}
              <button
                onClick={triggerFileInput}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-foreground/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-foreground animate-spin" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-foreground" />
                )}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <CardTitle className="mt-4">
              {fullName || user?.email?.split('@')[0] || 'Usuário'}
            </CardTitle>
            <CardDescription>{user?.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Badge variant="secondary">
                <Shield className="mr-1 h-3 w-3" />
                Administrador
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={triggerFileInput}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? 'Enviando...' : 'Alterar'}
              </Button>

              <Button
                variant="outline"
                onClick={handleRemoveAvatar}
                disabled={uploading || !avatarUrl}
                className="flex items-center gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              JPG, PNG, GIF ou WebP. Máx 5MB.
            </p>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Atualize suas informações de perfil</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  placeholder="Seu nome completo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <Separator className="my-6" />

            <div>
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Preferências de Notificação
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Notificações por E-mail</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba alertas importantes por e-mail
                    </p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="pushNotifications">Notificações Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações no navegador
                    </p>
                  </div>
                  <Switch
                    id="pushNotifications"
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Estatísticas de Uso
          </CardTitle>
          <CardDescription>Seu resumo de atividade no sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-primary">12</p>
              <p className="text-sm text-muted-foreground">Câmeras Monitoradas</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-warning">47</p>
              <p className="text-sm text-muted-foreground">Alertas Hoje</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-success">98%</p>
              <p className="text-sm text-muted-foreground">Taxa de Detecção</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-foreground">30</p>
              <p className="text-sm text-muted-foreground">Dias Ativos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AccountDeletionCard />
    </PageContent>
  );
}
