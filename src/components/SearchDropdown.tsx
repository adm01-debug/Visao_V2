import { useState, useEffect, useRef } from 'react';
import { Search, Camera, AlertTriangle, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CameraResult {
  id: string;
  name: string;
  location: string;
  status: string;
}

interface AlertResult {
  id: string;
  message: string;
  camera_name: string;
  severity: string;
  timestamp: string;
  type: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-muted-foreground',
  alert: 'bg-red-500',
  warning: 'bg-yellow-500',
};

export function SearchDropdown() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<CameraResult[]>([]);
  const [alerts, setAlerts] = useState<AlertResult[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search when query changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2) {
        setCameras([]);
        setAlerts([]);
        return;
      }

      setIsLoading(true);
      
      try {
        const searchTerm = `%${query.trim()}%`;

        // Search cameras and alerts in parallel
        const [camerasResult, alertsResult] = await Promise.all([
          supabase
            .from('cameras')
            .select('id, name, location, status')
            .or(`name.ilike.${searchTerm},location.ilike.${searchTerm}`)
            .limit(5),
          supabase
            .from('alerts')
            .select('id, message, camera_name, severity, timestamp, type')
            .or(`message.ilike.${searchTerm},camera_name.ilike.${searchTerm}`)
            .order('timestamp', { ascending: false })
            .limit(5),
        ]);

        setCameras(camerasResult.data || []);
        setAlerts(alertsResult.data || []);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleFocus = () => {
    setIsOpen(true);
  };

  const clearSearch = () => {
    setQuery('');
    setCameras([]);
    setAlerts([]);
    inputRef.current?.focus();
  };

  const hasResults = cameras.length > 0 || alerts.length > 0;
  const showDropdown = isOpen && (query.trim().length >= 2 || isLoading);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          placeholder="Buscar câmeras, alertas..."
          className="w-full h-10 pl-10 pr-10 rounded-lg bg-secondary border border-border text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Buscando...</span>
            </div>
          ) : !hasResults ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum resultado encontrado</p>
              <p className="text-xs mt-1">Tente buscar por outro termo</p>
            </div>
          ) : (
            <>
              {/* Cameras Section */}
              {cameras.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <Camera className="w-3 h-3" />
                      Câmeras ({cameras.length})
                    </div>
                  </div>
                  {cameras.map((camera) => (
                    <button
                      key={camera.id}
                      onClick={() => {
                        setIsOpen(false);
                        // Could navigate to camera or open modal
                      }}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[camera.status] || 'bg-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {camera.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {camera.location}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {camera.status}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {/* Alerts Section */}
              {alerts.length > 0 && (
                <div>
                  <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      <AlertTriangle className="w-3 h-3" />
                      Alertas ({alerts.length})
                    </div>
                  </div>
                  {alerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        setIsOpen(false);
                        // Could navigate to alert or open details
                      }}
                      className="w-full px-4 py-3 flex items-start gap-3 hover:bg-secondary/50 transition-colors text-left border-b border-border/50 last:border-0"
                    >
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        alert.severity === 'critical' ? 'text-red-400' :
                        alert.severity === 'high' ? 'text-orange-400' :
                        alert.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">
                          {alert.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {alert.camera_name}
                          </span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.timestamp), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                      <Badge className={`text-xs capitalize flex-shrink-0 ${SEVERITY_COLORS[alert.severity]}`}>
                        {alert.severity}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
