import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Search, Camera, Wifi, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscoveredCamera {
  ip: string;
  port: number;
  brand?: string;
  model?: string;
  protocol: 'rtsp' | 'onvif' | 'http';
}

interface NetworkCameraFinderProps {
  onCameraFound?: (cameras: DiscoveredCamera[]) => void;
  onCameraAdd?: (camera: DiscoveredCamera) => void;
  className?: string;
}

export function NetworkCameraFinder({ onCameraFound, onCameraAdd, className }: NetworkCameraFinderProps) {
  const [scanning, setScanning] = useState(false);
  const [cameras, setCameras] = useState<DiscoveredCamera[]>([]);

  const handleScan = async () => {
    setScanning(true);
    // Simulação - em produção seria uma chamada real
    setTimeout(() => {
      const found: DiscoveredCamera[] = [
        { ip: '192.168.1.100', port: 554, brand: 'Hikvision', model: 'DS-2CD2143', protocol: 'rtsp' },
        { ip: '192.168.1.101', port: 80, brand: 'Dahua', model: 'IPC-HDW4433', protocol: 'onvif' },
      ];
      setCameras(found);
      onCameraFound?.(found);
      setScanning(false);
    }, 2000);
  };

  return (
    <div className={cn('p-4 rounded-lg border bg-card', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          <span className="font-medium">Descoberta de Câmeras</span>
        </div>
        <Button onClick={handleScan} disabled={scanning} size="sm">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
          {scanning ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>
      <div className="space-y-2">
        {cameras.map((cam, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <Camera className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <p className="font-medium">{cam.brand} {cam.model}</p>
              <p className="text-xs text-muted-foreground">{cam.ip}:{cam.port} ({cam.protocol.toUpperCase()})</p>
            </div>
            {onCameraAdd && (
              <Button size="sm" variant="outline" onClick={() => onCameraAdd(cam)}>
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
        {cameras.length === 0 && !scanning && (
          <p className="text-center text-muted-foreground py-4">Clique em Buscar para descobrir câmeras na rede</p>
        )}
      </div>
    </div>
  );
}

export default NetworkCameraFinder;
