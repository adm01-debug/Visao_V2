import { memo } from 'react';
import {
  Search, Filter, Star, Eye, Grid, List,
  SortAsc, SortDesc, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { RecordingTrigger } from '@/types/clips';

interface ClipGalleryFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  triggerFilter: RecordingTrigger | 'all';
  onTriggerFilterChange: (value: RecordingTrigger | 'all') => void;
  sortBy: 'date' | 'duration';
  onSortByChange: (value: 'date' | 'duration') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderToggle: () => void;
  showFavoritesOnly: boolean;
  onFavoritesToggle: () => void;
  showUnviewedOnly: boolean;
  onUnviewedToggle: () => void;
  layout: 'grid' | 'list';
  onLayoutChange: (layout: 'grid' | 'list') => void;
}

function ClipGalleryFiltersComponent({
  search, onSearchChange,
  triggerFilter, onTriggerFilterChange,
  sortBy, onSortByChange,
  sortOrder, onSortOrderToggle,
  showFavoritesOnly, onFavoritesToggle,
  showUnviewedOnly, onUnviewedToggle,
  layout, onLayoutChange,
}: ClipGalleryFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar clips..." value={search} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
        {search && (
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => onSearchChange('')}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
      <Select value={triggerFilter} onValueChange={(v: string) => onTriggerFilterChange(v as 'all' | RecordingTrigger)}>
        <SelectTrigger className="w-32"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="alert">Alerta</SelectItem>
          <SelectItem value="rule">Regra</SelectItem>
          <SelectItem value="motion">Movimento</SelectItem>
          <SelectItem value="schedule">Agendado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={(v: string) => onSortByChange(v as 'date' | 'duration')}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="date">Data</SelectItem>
          <SelectItem value="duration">Duração</SelectItem>
        </SelectContent>
      </Select>
      <Button variant="outline" size="icon" onClick={onSortOrderToggle}>
        {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
      </Button>
      <Button variant={showFavoritesOnly ? 'secondary' : 'outline'} size="icon" onClick={onFavoritesToggle}>
        <Star className={cn('w-4 h-4', showFavoritesOnly && 'fill-yellow-400 text-yellow-400')} />
      </Button>
      <Button variant={showUnviewedOnly ? 'secondary' : 'outline'} size="icon" onClick={onUnviewedToggle}>
        <Eye className="w-4 h-4" />
      </Button>
      <div className="flex border rounded-lg">
        <Button variant={layout === 'grid' ? 'secondary' : 'ghost'} size="icon" className="rounded-r-none" onClick={() => onLayoutChange('grid')}>
          <Grid className="w-4 h-4" />
        </Button>
        <Button variant={layout === 'list' ? 'secondary' : 'ghost'} size="icon" className="rounded-l-none" onClick={() => onLayoutChange('list')}>
          <List className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export const ClipGalleryFilters = memo(ClipGalleryFiltersComponent);
