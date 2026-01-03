/**
 * VISÃO - Sistema de Vigilância Inteligente
 * TelegramSettings Component (Simplified version)
 */

import { memo } from 'react';
import { MessageSquare, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TelegramSettingsProps {
  enabled: boolean;
  chatId: string;
  isConnected: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onChatIdChange: (chatId: string) => void;
  className?: string;
}

function TelegramSettingsComponent({
  enabled,
  chatId,
  isConnected,
  onEnabledChange,
  onChatIdChange,
  className
}: TelegramSettingsProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Telegram
            {isConnected ? (
              <Badge variant="secondary" className="gap-1">
                <Check className="w-3 h-3" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1">
                <X className="w-3 h-3" />
                Desconectado
              </Badge>
            )}
          </CardTitle>
          <Switch checked={enabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>

      <CardContent className={cn(!enabled && "opacity-50 pointer-events-none")}>
        <div className="space-y-2">
          <Label htmlFor="telegram-chat-id">Chat ID</Label>
          <Input
            id="telegram-chat-id"
            placeholder="Digite o Chat ID do Telegram"
            value={chatId}
            onChange={(e) => onChatIdChange(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Envie /start para @seu_bot e depois obtenha o Chat ID com @userinfobot
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export const TelegramSettings = memo(TelegramSettingsComponent);
