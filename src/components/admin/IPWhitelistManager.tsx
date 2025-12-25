/**
 * IP Whitelist Manager Component
 * Componente para administradores gerenciarem a whitelist de IPs
 */

import { useState, useEffect } from 'react';
import { Plus, Trash2, Shield, AlertTriangle, Check, Ban, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  IP_WHITELIST_CONFIG, 
  PRODUCTION_WHITELIST, 
  ADMIN_IPS 
} from '@/config/ipWhitelist';
import { isValidIPv4 } from '@/lib/ipUtils';
import { 
  addToWhitelist, 
  removeFromWhitelist, 
  blockIP, 
  unblockIP 
} from '@/middleware/ipWhitelist';

interface IPEntry {
  ip: string;
  type: 'trusted' | 'blocked' | 'admin' | 'production';
  addedAt?: string;
  addedBy?: string;
}

export const IPWhitelistManager = () => {
  const { toast } = useToast();
  const [newIP, setNewIP] = useState('');
  const [isEnabled, setIsEnabled] = useState(IP_WHITELIST_CONFIG.enabled);
  const [allowLocalhost, setAllowLocalhost] = useState(IP_WHITELIST_CONFIG.allowLocalhost);
  const [allowPrivate, setAllowPrivate] = useState(IP_WHITELIST_CONFIG.allowPrivateNetworks);
  const [trustedIPs, setTrustedIPs] = useState<string[]>(IP_WHITELIST_CONFIG.trustedIPs);
  const [blockedIPs, setBlockedIPs] = useState<string[]>(IP_WHITELIST_CONFIG.blockedIPs);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddIP = (type: 'trusted' | 'blocked') => {
    if (!newIP.trim()) {
      toast({ title: 'Erro', description: 'Digite um IP válido', variant: 'destructive' });
      return;
    }

    if (!isValidIPv4(newIP)) {
      toast({ title: 'Erro', description: 'Formato de IP inválido', variant: 'destructive' });
      return;
    }

    if (type === 'trusted') {
      if (trustedIPs.includes(newIP)) {
        toast({ title: 'Aviso', description: 'IP já está na whitelist', variant: 'default' });
        return;
      }
      const success = addToWhitelist(newIP);
      if (success) {
        setTrustedIPs([...trustedIPs, newIP]);
        toast({ title: 'Sucesso', description: `IP ${newIP} adicionado à whitelist` });
      }
    } else {
      if (blockedIPs.includes(newIP)) {
        toast({ title: 'Aviso', description: 'IP já está bloqueado', variant: 'default' });
        return;
      }
      const success = blockIP(newIP);
      if (success) {
        setBlockedIPs([...blockedIPs, newIP]);
        toast({ title: 'Sucesso', description: `IP ${newIP} bloqueado`, variant: 'destructive' });
      }
    }
    setNewIP('');
  };

  const handleRemoveIP = (ip: string, type: 'trusted' | 'blocked') => {
    if (type === 'trusted') {
      const success = removeFromWhitelist(ip);
      if (success) {
        setTrustedIPs(trustedIPs.filter(i => i !== ip));
        toast({ title: 'Removido', description: `IP ${ip} removido da whitelist` });
      }
    } else {
      const success = unblockIP(ip);
      if (success) {
        setBlockedIPs(blockedIPs.filter(i => i !== ip));
        toast({ title: 'Desbloqueado', description: `IP ${ip} desbloqueado` });
      }
    }
  };

  const handleToggleEnabled = (enabled: boolean) => {
    setIsEnabled(enabled);
    IP_WHITELIST_CONFIG.enabled = enabled;
    toast({
      title: enabled ? 'Whitelist Ativada' : 'Whitelist Desativada',
      description: enabled 
        ? 'Apenas IPs autorizados podem acessar' 
        : 'Todos os IPs podem acessar',
      variant: enabled ? 'default' : 'destructive',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Gerenciamento de IPs</CardTitle>
                <CardDescription>
                  Configure quais IPs podem acessar o sistema
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="whitelist-enabled">Whitelist Ativa</Label>
              <Switch
                id="whitelist-enabled"
                checked={isEnabled}
                onCheckedChange={handleToggleEnabled}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Configurações Gerais */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-localhost">Permitir Localhost</Label>
              <Switch
                id="allow-localhost"
                checked={allowLocalhost}
                onCheckedChange={(v) => {
                  setAllowLocalhost(v);
                  IP_WHITELIST_CONFIG.allowLocalhost = v;
                }}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="allow-private">Permitir Redes Privadas</Label>
              <Switch
                id="allow-private"
                checked={allowPrivate}
                onCheckedChange={(v) => {
                  setAllowPrivate(v);
                  IP_WHITELIST_CONFIG.allowPrivateNetworks = v;
                }}
              />
            </div>
          </div>

          {/* Adicionar IP */}
          <div className="flex gap-2 mb-6">
            <Input
              placeholder="Digite o IP (ex: 192.168.1.100)"
              value={newIP}
              onChange={(e) => setNewIP(e.target.value)}
              className="flex-1"
            />
            <Button onClick={() => handleAddIP('trusted')} variant="default">
              <Plus className="w-4 h-4 mr-1" /> Adicionar
            </Button>
            <Button onClick={() => handleAddIP('blocked')} variant="destructive">
              <Ban className="w-4 h-4 mr-1" /> Bloquear
            </Button>
          </div>

          <Tabs defaultValue="trusted" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trusted">
                Confiáveis ({trustedIPs.length})
              </TabsTrigger>
              <TabsTrigger value="blocked">
                Bloqueados ({blockedIPs.length})
              </TabsTrigger>
              <TabsTrigger value="admin">
                Admin ({ADMIN_IPS.length})
              </TabsTrigger>
              <TabsTrigger value="production">
                Produção ({PRODUCTION_WHITELIST.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="trusted" className="mt-4">
              <div className="space-y-2">
                {trustedIPs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum IP na whitelist
                  </p>
                ) : (
                  trustedIPs.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <code className="text-sm">{ip}</code>
                        <Badge variant="outline">Confiável</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveIP(ip, 'trusted')}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="blocked" className="mt-4">
              <div className="space-y-2">
                {blockedIPs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum IP bloqueado
                  </p>
                ) : (
                  blockedIPs.map((ip) => (
                    <div key={ip} className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Ban className="w-4 h-4 text-destructive" />
                        <code className="text-sm">{ip}</code>
                        <Badge variant="destructive">Bloqueado</Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveIP(ip, 'blocked')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="admin" className="mt-4">
              <div className="space-y-2">
                {ADMIN_IPS.map((ip) => (
                  <div key={ip} className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
                    <Shield className="w-4 h-4 text-primary" />
                    <code className="text-sm">{ip}</code>
                    <Badge>Admin</Badge>
                  </div>
                ))}
                {ADMIN_IPS.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Configure IPs de admin em ipWhitelist.ts
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="production" className="mt-4">
              <div className="space-y-2">
                {PRODUCTION_WHITELIST.map((ip) => (
                  <div key={ip} className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                    <Check className="w-4 h-4 text-blue-500" />
                    <code className="text-sm">{ip}</code>
                    <Badge variant="secondary">Produção</Badge>
                  </div>
                ))}
                {PRODUCTION_WHITELIST.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Configure IPs de produção em ipWhitelist.ts
                  </p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Aviso */}
      <Card className="border-yellow-500/50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Importante</p>
              <p className="text-muted-foreground">
                Alterações na whitelist são aplicadas imediatamente. 
                Certifique-se de incluir seu próprio IP antes de ativar a restrição.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default IPWhitelistManager;
