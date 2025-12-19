import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapboxToken } from '@/hooks/useMapboxToken';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, MapPin } from 'lucide-react';

interface Camera {
  id: string;
  name: string;
  location: string;
  status: 'online' | 'offline' | 'alert' | 'warning';
  latitude?: number | null;
  longitude?: number | null;
}

interface CameraMapProps {
  cameras: Camera[];
  onCameraClick?: (cameraId: string) => void;
  className?: string;
}

// Simulated coordinates based on location names (in production, these would come from the database)
const locationCoordinates: Record<string, [number, number]> = {
  'Entrada Principal': [-46.6333, -23.5505],
  'Estacionamento A': [-46.6340, -23.5510],
  'Estacionamento B': [-46.6325, -23.5515],
  'Corredor Norte': [-46.6335, -23.5500],
  'Corredor Sul': [-46.6330, -23.5520],
  'Área de Produção': [-46.6320, -23.5508],
  'Refeitório': [-46.6345, -23.5512],
  'Recepção': [-46.6338, -23.5503],
};

const getStatusColor = (status: Camera['status']) => {
  switch (status) {
    case 'online': return '#22c55e';
    case 'offline': return '#6b7280';
    case 'alert': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#6b7280';
  }
};

export function CameraMap({ cameras, onCameraClick, className = '' }: CameraMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { token, loading, error } = useMapboxToken();
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapContainer.current || !token || map.current) return;

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-46.6333, -23.5505],
      zoom: 15,
      pitch: 45,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      'top-right'
    );

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [token]);

  // Update markers when cameras change
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    cameras.forEach((camera, index) => {
      // Use real coordinates from database if available, otherwise use simulated
      const coords: [number, number] = (camera.longitude != null && camera.latitude != null)
        ? [camera.longitude, camera.latitude]
        : locationCoordinates[camera.location] || [
            -46.6333 + (index * 0.001),
            -23.5505 + (index * 0.0005)
          ];

      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'camera-marker';
      el.innerHTML = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${getStatusColor(camera.status)};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
            <path d="M23 7l-7 5 7 5V7z"></path>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
        </div>
      `;

      el.addEventListener('mouseenter', () => {
        el.querySelector('div')!.style.transform = 'scale(1.2)';
      });
      el.addEventListener('mouseleave', () => {
        el.querySelector('div')!.style.transform = 'scale(1)';
      });

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
        <div style="padding: 8px; min-width: 150px;">
          <strong style="font-size: 14px;">${camera.name}</strong>
          <p style="margin: 4px 0; font-size: 12px; color: #666;">${camera.location}</p>
          <span style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 11px;
            background: ${getStatusColor(camera.status)}20;
            color: ${getStatusColor(camera.status)};
            font-weight: 500;
          ">
            ${camera.status === 'online' ? 'Online' : 
              camera.status === 'offline' ? 'Offline' : 
              camera.status === 'alert' ? 'Alerta' : 'Atenção'}
          </span>
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!);

      el.addEventListener('click', () => {
        onCameraClick?.(camera.id);
      });

      markersRef.current.push(marker);
    });
  }, [cameras, mapLoaded, onCameraClick]);

  if (loading) {
    return <Skeleton className={`h-64 ${className}`} />;
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 bg-secondary/50 rounded-lg ${className}`}>
        <AlertTriangle className="w-8 h-8 text-warning mb-2" />
        <p className="text-sm text-muted-foreground text-center">
          Não foi possível carregar o mapa.<br />
          Verifique se o token do Mapbox está configurado.
        </p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[300px]" />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <p className="text-xs font-medium mb-2 text-foreground">Legenda</p>
        <div className="space-y-1">
          {[
            { status: 'online', label: 'Online' },
            { status: 'warning', label: 'Atenção' },
            { status: 'alert', label: 'Alerta' },
            { status: 'offline', label: 'Offline' },
          ].map(({ status, label }) => (
            <div key={status} className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: getStatusColor(status as Camera['status']) }}
              />
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Camera count */}
      <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{cameras.length} câmeras</span>
        </div>
      </div>
    </div>
  );
}
