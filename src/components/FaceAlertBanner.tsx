/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: FaceAlertBanner - Alertas em tempo real de faces
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { ShieldAlert, X, User, Clock, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FaceAlert {
  id: string;
  person_name: string;
  person_image?: string;
  camera_name: string;
  confidence: number;
  timestamp: string;
  list_type: 'blacklist' | 'vip';
}

export function FaceAlertBanner() {
  const [alerts, setAlerts] = useState<FaceAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const channel = supabase
      .channel('face-alerts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'face_detections',
        filter: 'list_type=eq.blacklist'
      }, (payload) => {
        const detection = payload.new as FaceAlert;
        setAlerts(prev => [detection, ...prev.slice(0, 4)]);
        
        // Play alert sound
        const audio = new Audio('/sounds/alert.mp3');
        audio.play().catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismissAlert = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 z-50 space-y-2 max-w-md">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} variant="destructive" className="animate-pulse shadow-lg">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Pessoa Bloqueada!
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => dismissAlert(alert.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={alert.person_image} />
                <AvatarFallback>{alert.person_name?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{alert.person_name || 'Desconhecido'}</p>
                <Badge variant="destructive" className="text-xs">
                  {(alert.confidence * 100).toFixed(0)}% confiança
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <Camera className="h-3 w-3" />
                {alert.camera_name}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(alert.timestamp), "HH:mm:ss", { locale: ptBR })}
              </span>
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
