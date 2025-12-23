import { useOnClickOutside } from "@/hooks";
import { memo } from "react";
import { useDebounce } from "@/hooks";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Camera, AlertTriangle, X, Loader2, MapPin, Clock, Filter, Calendar, History, Trash2, Star, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, subDays, subWeeks, subMonths, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface CameraResult {
  id: string;
  name: string;
  location: string;
  status: string;
  thumbnail?: string;
  detected_people?: number;
  last_activity?: string;
}

interface AlertResult {
  id: string;
  message: string;
  camera_name: string;
  severity: string;
  timestamp: string;
  type: string;
  thumbnail?: string;
}

type SearchItem = 
  | { type: 'camera'; data: CameraResult }
  | { type: 'alert'; data: AlertResult };

interface Filters {
  cameraStatus: string[];
  alertSeverity: string[];
  timePeriod: string;
}

interface SavedFilter {
  id: string;
  name: string;
  filters: Filters;
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

const STATUS_LABELS: Record<string, string> = {
  online: 'Online',
  offline: 'Offline',
  alert: 'Em Alerta',
  warning: 'Atenção',
};

const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

const TIME_PERIODS: { value: string; label: string }[] = [
  { value: 'all', label: 'Todo período' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Última semana' },
  { value: 'month', label: 'Último mês' },
];

const STORAGE_KEY = 'search-history';
const FILTERS_STORAGE_KEY = 'saved-filters';
const MAX_HISTORY_ITEMS = 10;

export function SearchDropdown() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cameras, setCameras] = useState<CameraResult[]>([]);
  const [alerts, setAlerts] = useState<AlertResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedCamera, setSelectedCamera] = useState<CameraResult | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AlertResult | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    cameraStatus: [],
    alertSeverity: [],
    timePeriod: 'all',
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [newFilterName, setNewFilterName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const hasActiveFilters = filters.cameraStatus.length > 0 || filters.alertSeverity.length > 0 || filters.timePeriod !== 'all';
  const activeFilterCount = filters.cameraStatus.length + filters.alertSeverity.length + (filters.timePeriod !== 'all' ? 1 : 0);

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSearchHistory(JSON.parse(stored));
      }
    } catch (error) {
    }
    
    // Load saved filters
    try {
      const storedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (storedFilters) {
        setSavedFilters(JSON.parse(storedFilters));
      }
    } catch (error) {
    }
  }, []);

  // Build flat list of all items for keyboard navigation
  const allItems: SearchItem[] = [
    ...cameras.map(c => ({ type: 'camera' as const, data: c })),
    ...alerts.map(a => ({ type: 'alert' as const, data: a })),
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut (Ctrl+K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Get time filter date
  const getTimeFilterDate = useCallback(() => {
    const now = new Date();
    switch (filters.timePeriod) {
      case 'today':
        return startOfDay(now).toISOString();
      case 'week':
        return subWeeks(now, 1).toISOString();
      case 'month':
        return subMonths(now, 1).toISOString();
      default:
        return null;
    }
  }, [filters.timePeriod]);

  // Search when query or filters change
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      if (query.trim().length < 2 && !hasActiveFilters) {
        setCameras([]);
        setAlerts([]);
        setActiveIndex(-1);
        return;
      }

      setIsLoading(true);
      setActiveIndex(-1);
      
      try {
        const searchTerm = query.trim().length >= 2 ? `%${query.trim()}%` : null;
        const timeFilter = getTimeFilterDate();

        // Build cameras query
        let camerasQuery = supabase
          .from('cameras')
          .select('id, name, location, status, thumbnail, detected_people, last_activity');
        
        if (searchTerm) {
          camerasQuery = camerasQuery.or(`name.ilike.${searchTerm},location.ilike.${searchTerm}`);
        }
        
        if (filters.cameraStatus.length > 0) {
          camerasQuery = camerasQuery.in('status', filters.cameraStatus as ('online' | 'offline' | 'alert' | 'warning')[]);
        }
        
        if (timeFilter) {
          camerasQuery = camerasQuery.gte('last_activity', timeFilter);
        }

        // Build alerts query
        let alertsQuery = supabase
          .from('alerts')
          .select('id, message, camera_name, severity, timestamp, type, thumbnail')
          .order('timestamp', { ascending: false });
        
        if (searchTerm) {
          alertsQuery = alertsQuery.or(`message.ilike.${searchTerm},camera_name.ilike.${searchTerm}`);
        }
        
        if (filters.alertSeverity.length > 0) {
          alertsQuery = alertsQuery.in('severity', filters.alertSeverity as ('low' | 'medium' | 'high' | 'critical')[]);
        }
        
        if (timeFilter) {
          alertsQuery = alertsQuery.gte('timestamp', timeFilter);
        }

        const [camerasResult, alertsResult] = await Promise.all([
          camerasQuery.limit(10),
          alertsQuery.limit(10),
        ]);

        setCameras(camerasResult.data || []);
        setAlerts(alertsResult.data || []);
      } catch (error) {
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query, filters, hasActiveFilters, getTimeFilterDate]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && itemRefs.current[activeIndex]) {
      itemRefs.current[activeIndex]?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    }
  }, [activeIndex]);

  const addToHistory = useCallback((term: string) => {
    if (term.trim().length < 2) return;
    
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== term.toLowerCase());
      const newHistory = [term.trim(), ...filtered].slice(0, MAX_HISTORY_ITEMS);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
      }
      return newHistory;
    });
  }, []);

  const handleSelect = useCallback((item: SearchItem) => {
    // Save search to history before clearing
    if (query.trim().length >= 2) {
      addToHistory(query.trim());
    }
    
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery('');
    setCameras([]);
    setAlerts([]);

    if (item.type === 'camera') {
      setSelectedCamera(item.data);
    } else {
      setSelectedAlert(item.data);
    }
  }, [query, addToHistory]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || allItems.length === 0) {
      if (e.key === 'Escape') {
        inputRef.current?.blur();
        setIsOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex(prev => 
          prev < allItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex(prev => 
          prev > 0 ? prev - 1 : allItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < allItems.length) {
          handleSelect(allItems[activeIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const clearSearch = () => {
    setQuery('');
    setCameras([]);
    setAlerts([]);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const clearFilters = () => {
    setFilters({
      cameraStatus: [],
      alertSeverity: [],
      timePeriod: 'all',
    });
  };

  const toggleCameraStatus = (status: string) => {
    setFilters(prev => ({
      ...prev,
      cameraStatus: prev.cameraStatus.includes(status)
        ? prev.cameraStatus.filter(s => s !== status)
        : [...prev.cameraStatus, status],
    }));
  };

  const toggleAlertSeverity = (severity: string) => {
    setFilters(prev => ({
      ...prev,
      alertSeverity: prev.alertSeverity.includes(severity)
        ? prev.alertSeverity.filter(s => s !== severity)
        : [...prev.alertSeverity, severity],
    }));
  };

  const setTimePeriod = (period: string) => {
    setFilters(prev => ({ ...prev, timePeriod: period }));
  };


  const removeFromHistory = (term: string) => {
    setSearchHistory(prev => {
      const newHistory = prev.filter(item => item !== term);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
      } catch (error) {
      }
      return newHistory;
    });
  };

  const clearHistory = () => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
    }
  };

  const selectFromHistory = (term: string) => {
    setQuery(term);
    addToHistory(term);
    inputRef.current?.focus();
  };

  const saveCurrentFilter = () => {
    if (!newFilterName.trim() || !hasActiveFilters) return;
    
    const newFilter: SavedFilter = {
      id: Date.now().toString(),
      name: newFilterName.trim(),
      filters: { ...filters },
    };
    
    setSavedFilters(prev => {
      const updated = [...prev, newFilter];
      try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
      }
      return updated;
    });
    
    setNewFilterName('');
    setShowSaveInput(false);
  };

  const applySavedFilter = (savedFilter: SavedFilter) => {
    setFilters(savedFilter.filters);
  };

  const deleteSavedFilter = (id: string) => {
    setSavedFilters(prev => {
      const updated = prev.filter(f => f.id !== id);
      try {
        localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
      }
      return updated;
    });
  };

  const getFilterSummary = (f: Filters): string => {
    const parts: string[] = [];
    if (f.cameraStatus.length > 0) {
      parts.push(`${f.cameraStatus.length} status`);
    }
    if (f.alertSeverity.length > 0) {
      parts.push(`${f.alertSeverity.length} severidade`);
    }
    if (f.timePeriod !== 'all') {
      const period = TIME_PERIODS.find(p => p.value === f.timePeriod);
      parts.push(period?.label || f.timePeriod);
    }
    return parts.join(' • ') || 'Nenhum filtro';
  };

  const hasResults = cameras.length > 0 || alerts.length > 0;
  const showDropdown = isOpen && (query.trim().length >= 2 || isLoading || hasActiveFilters || (query.trim().length === 0 && searchHistory.length > 0));
  const showHistory = isOpen && query.trim().length === 0 && !hasActiveFilters && searchHistory.length > 0;

  // Calculate index offset for alerts (they come after cameras)
  const alertIndexOffset = cameras.length;

  return (
    <>
      <div ref={containerRef} className="relative w-full">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={handleFocus}
              onKeyDown={handleKeyDown}
              placeholder="Buscar câmeras, alertas... (Ctrl+K)"
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

          {/* Filter Button */}
          <Popover open={showFilters} onOpenChange={setShowFilters}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className={`h-10 w-10 shrink-0 ${hasActiveFilters ? 'bg-primary/10 border-primary text-primary' : ''}`}
              >
                <Filter className="w-4 h-4" />
                {hasActiveFilters && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-primary-foreground text-[10px] rounded-full flex items-center justify-center font-medium">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="p-3 border-b border-border">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Filtros Avançados</h4>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                      Limpar filtros
                    </Button>
                  )}
                </div>
              </div>

              {/* Saved Filters Section */}
              {savedFilters.length > 0 && (
                <div className="p-3 border-b border-border bg-muted/20">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <Star className="w-3 h-3" />
                    Filtros Salvos
                  </label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {savedFilters.map((saved) => (
                      <div
                        key={saved.id}
                        className="flex items-center gap-2 group"
                      >
                        <button
                          onClick={() => applySavedFilter(saved)}
                          className="flex-1 px-2.5 py-1.5 rounded-md text-left text-xs bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <span className="font-medium text-foreground">{saved.name}</span>
                          <span className="block text-[10px] text-muted-foreground mt-0.5">
                            {getFilterSummary(saved.filters)}
                          </span>
                        </button>
                        <button
                          onClick={() => deleteSavedFilter(saved.id)}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 space-y-4">
                {/* Camera Status Filter */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <Camera className="w-3 h-3" />
                    Status da Câmera
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => toggleCameraStatus(value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                          filters.cameraStatus.includes(value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[value]}`} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert Severity Filter */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <AlertTriangle className="w-3 h-3" />
                    Severidade do Alerta
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(SEVERITY_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => toggleAlertSeverity(value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          filters.alertSeverity.includes(value)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Period Filter */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2">
                    <Calendar className="w-3 h-3" />
                    Período
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {TIME_PERIODS.map(({ value, label }) => (
                      <button
                        key={value}
                        onClick={() => setTimePeriod(value)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                          filters.timePeriod === value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-secondary hover:bg-secondary/80 text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-3 border-t border-border bg-muted/30 space-y-2">
                {/* Save Filter Input */}
                {hasActiveFilters && (
                  showSaveInput ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFilterName}
                        onChange={(e) => setNewFilterName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveCurrentFilter();
                          if (e.key === 'Escape') setShowSaveInput(false);
                        }}
                        placeholder="Nome do filtro..."
                        className="flex-1 h-8 px-2.5 text-xs rounded-md bg-secondary border border-border focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={saveCurrentFilter}
                        disabled={!newFilterName.trim()}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setShowSaveInput(false);
                          setNewFilterName('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowSaveInput(true)}
                    >
                      <Star className="w-3.5 h-3.5 mr-1.5" />
                      Salvar Filtro
                    </Button>
                  )
                )}
                
                <Button 
                  className="w-full" 
                  size="sm"
                  onClick={() => {
                    setShowFilters(false);
                    setIsOpen(true);
                    inputRef.current?.focus();
                  }}
                >
                  Aplicar Filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded-lg shadow-xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
            {/* Search History */}
            {showHistory ? (
              <div>
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <History className="w-3 h-3" />
                    Buscas Recentes
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearHistory}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                </div>
                {searchHistory.map((term, index) => (
                  <div
                    key={`${term}-${index}`}
                    className="flex items-center group"
                  >
                    <button
                      onClick={() => selectFromHistory(term)}
                      className="flex-1 px-4 py-2.5 flex items-center gap-3 transition-colors text-left hover:bg-secondary/50"
                    >
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{term}</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromHistory(term);
                      }}
                      className="px-3 py-2.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : isLoading ? (
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
                {/* Keyboard hint */}
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{allItems.length} resultado(s)</span>
                  <div className="flex items-center gap-2">
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">↑↓</kbd>
                    <span>navegar</span>
                    <kbd className="px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">Enter</kbd>
                    <span>selecionar</span>
                  </div>
                </div>

                {/* Cameras Section */}
                {cameras.length > 0 && (
                  <div>
                    <div className="px-3 py-2 bg-secondary/50 border-b border-border">
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        <Camera className="w-3 h-3" />
                        Câmeras ({cameras.length})
                      </div>
                    </div>
                    {cameras.map((camera, index) => (
                      <button
                        key={camera.id}
                        ref={el => itemRefs.current[index] = el}
                        onClick={() => handleSelect({ type: 'camera', data: camera })}
                        onMouseEnter={() => setActiveIndex(index)}
                        className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left border-b border-border/50 last:border-0 ${
                          activeIndex === index 
                            ? 'bg-primary/10 border-l-2 border-l-primary' 
                            : 'hover:bg-secondary/50'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${STATUS_COLORS[camera.status] || 'bg-muted-foreground'}`} />
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
                    {alerts.map((alert, index) => {
                      const itemIndex = alertIndexOffset + index;
                      return (
                        <button
                          key={alert.id}
                          ref={el => itemRefs.current[itemIndex] = el}
                          onClick={() => handleSelect({ type: 'alert', data: alert })}
                          onMouseEnter={() => setActiveIndex(itemIndex)}
                          className={`w-full px-4 py-3 flex items-start gap-3 transition-colors text-left border-b border-border/50 last:border-0 ${
                            activeIndex === itemIndex 
                              ? 'bg-primary/10 border-l-2 border-l-primary' 
                              : 'hover:bg-secondary/50'
                          }`}
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
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Camera Details Dialog */}
      <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              {selectedCamera?.name}
            </DialogTitle>
            <DialogDescription>
              Detalhes da câmera
            </DialogDescription>
          </DialogHeader>
          {selectedCamera && (
            <div className="space-y-4">
              {selectedCamera.thumbnail && (
                <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
                  <img 
                    src={selectedCamera.thumbnail} 
                    alt={selectedCamera.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Localização:</span>
                  <span className="font-medium">{selectedCamera.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[selectedCamera.status]}`} />
                  <span className="text-muted-foreground">Status:</span>
                  <Badge variant="outline" className="capitalize">
                    {STATUS_LABELS[selectedCamera.status] || selectedCamera.status}
                  </Badge>
                </div>
                {selectedCamera.detected_people !== undefined && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Pessoas detectadas:</span>
                    <span className="font-medium">{selectedCamera.detected_people}</span>
                  </div>
                )}
                {selectedCamera.last_activity && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Última atividade:</span>
                    <span className="font-medium">
                      {format(new Date(selectedCamera.last_activity), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert Details Dialog */}
      <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${
                selectedAlert?.severity === 'critical' ? 'text-red-400' :
                selectedAlert?.severity === 'high' ? 'text-orange-400' :
                selectedAlert?.severity === 'medium' ? 'text-yellow-400' : 'text-blue-400'
              }`} />
              Detalhes do Alerta
            </DialogTitle>
            <DialogDescription>
              Informações completas do alerta
            </DialogDescription>
          </DialogHeader>
          {selectedAlert && (
            <div className="space-y-4">
              {selectedAlert.thumbnail && (
                <div className="aspect-video rounded-lg overflow-hidden bg-secondary">
                  <img 
                    src={selectedAlert.thumbnail} 
                    alt="Captura do alerta"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 rounded-lg bg-secondary/50 border border-border">
                <p className="text-sm">{selectedAlert.message}</p>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Severidade:</span>
                  <Badge className={`capitalize ${SEVERITY_COLORS[selectedAlert.severity]}`}>
                    {selectedAlert.severity}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="outline" className="capitalize">
                    {selectedAlert.type}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Camera className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Câmera:</span>
                  <span className="font-medium">{selectedAlert.camera_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Data/Hora:</span>
                  <span className="font-medium">
                    {format(new Date(selectedAlert.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
