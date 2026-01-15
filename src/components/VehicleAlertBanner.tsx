/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: VehicleAlertBanner - Alertas em tempo real de veículos
 */

import { useState, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, X, Car, Clock, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface VehicleAlert {
  id: string;
  plate: string;
  camera_name: string;
  timestamp: string;
  type: 'blacklist' | 'expired' | 'unknown';
}

export function VehicleAlertBanner() {
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Subscribe to plate detection alerts
    const channel = supabase
      .channel('vehicle-alerts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'plate_detections',
        filter: 'is_blacklisted=eq.true'
      }, (payload) => {
        const detection = payload.new as VehicleAlert;
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
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {visibleAlerts.map((alert) => (
        <Alert key={alert.id} variant="destructive" className="animate-pulse shadow-lg">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Veículo Bloqueado!
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
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="font-mono text-lg">
                {alert.plate}
              </Badge>
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
