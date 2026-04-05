/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Componente: ClipGallery (Refatorado)
 */
import { memo, useMemo, useState } from 'react';
import { Film, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { VideoClip, RecordingTrigger } from '@/types/clips';
import { ClipCard } from '@/components/clips/ClipCard';
import { ClipRow } from '@/components/clips/ClipRow';
import { VideoPlayerModal } from '@/components/clips/VideoPlayerModal';
import { ClipGalleryFilters } from '@/components/clips/ClipGalleryFilters';

interface ClipGalleryProps {
  clips: VideoClip[];
  onPlay?: (clip: VideoClip) => void;
  onDownload?: (clip: VideoClip) => void;
  onDelete?: (clipId: string) => void;
  onToggleFavorite?: (clipId: string) => void;
  onMarkViewed?: (clipId: string) => void;
  defaultLayout?: 'grid' | 'list';
  showFilters?: boolean;
  maxHeight?: number | string;
  className?: string;
}

export function ClipGallery({
  clips, onPlay, onDownload, onDelete, onToggleFavorite, onMarkViewed,
  defaultLayout = 'grid', showFilters = true, maxHeight, className,
}: ClipGalleryProps) {
  const [layout, setLayout] = useState<'grid' | 'list'>(defaultLayout);
  const [search, setSearch] = useState('');
  const [triggerFilter, setTriggerFilter] = useState<RecordingTrigger | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'duration'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [showUnviewedOnly, setShowUnviewedOnly] = useState(false);
  const [selectedClips, setSelectedClips] = useState<Set<string>>(new Set());
  const [playerClip, setPlayerClip] = useState<VideoClip | null>(null);

  const filteredClips = useMemo(() => {
    let result = [...clips];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(c =>
        c.cameraName.toLowerCase().includes(s) ||
        c.notes?.toLowerCase().includes(s) ||
        c.tags?.some(t => t.toLowerCase().includes(s))
      );
    }
    if (triggerFilter !== 'all') result = result.filter(c => c.trigger === triggerFilter);
    if (showFavoritesOnly) result = result.filter(c => c.isFavorite);
    if (showUnviewedOnly) result = result.filter(c => !c.isViewed);
    result.sort((a, b) => {
      const cmp = sortBy === 'date'
        ? a.startedAt.getTime() - b.startedAt.getTime()
        : a.duration - b.duration;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [clips, search, triggerFilter, showFavoritesOnly, showUnviewedOnly, sortBy, sortOrder]);

  const handleSelectClip = (id: string, selected: boolean) => {
    setSelectedClips(prev => {
      const s = new Set(prev);
      selected ? s.add(id) : s.delete(id);
      return s;
    });
  };

  const handleSelectAll = () => {
    setSelectedClips(prev =>
      prev.size === filteredClips.length ? new Set() : new Set(filteredClips.map(c => c.id))
    );
  };

  const handleBulkDelete = () => {
    selectedClips.forEach(id => onDelete?.(id));
    setSelectedClips(new Set());
  };

  const handlePlayClip = (clip: VideoClip) => {
    setPlayerClip(clip);
    onPlay?.(clip);
    if (!clip.isViewed) onMarkViewed?.(clip.id);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {showFilters && (
        <ClipGalleryFilters
          search={search} onSearchChange={setSearch}
          triggerFilter={triggerFilter} onTriggerFilterChange={setTriggerFilter}
          sortBy={sortBy} onSortByChange={setSortBy}
          sortOrder={sortOrder} onSortOrderToggle={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
          showFavoritesOnly={showFavoritesOnly} onFavoritesToggle={() => setShowFavoritesOnly(!showFavoritesOnly)}
          showUnviewedOnly={showUnviewedOnly} onUnviewedToggle={() => setShowUnviewedOnly(!showUnviewedOnly)}
          layout={layout} onLayoutChange={setLayout}
        />
      )}

      {selectedClips.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent rounded-lg">
          <Checkbox checked={selectedClips.size === filteredClips.length} onCheckedChange={handleSelectAll} />
          <span className="text-sm">{selectedClips.size} selecionado(s)</span>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-2" />Excluir selecionados
          </Button>
        </div>
      )}

      <ScrollArea style={{ maxHeight: maxHeight || 'auto' }}>
        {filteredClips.length === 0 ? (
          <div className="text-center py-12">
            <Film className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">{clips.length === 0 ? 'Nenhum clip gravado' : 'Nenhum clip encontrado'}</p>
          </div>
        ) : layout === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredClips.map(clip => (
              <ClipCard key={clip.id} clip={clip} onPlay={handlePlayClip} onDownload={onDownload} onDelete={onDelete} onToggleFavorite={onToggleFavorite} onMarkViewed={onMarkViewed} />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredClips.map(clip => (
              <ClipRow key={clip.id} clip={clip} selected={selectedClips.has(clip.id)} onSelect={handleSelectClip} onPlay={handlePlayClip} onDownload={onDownload} onDelete={onDelete} onToggleFavorite={onToggleFavorite} />
            ))}
          </div>
        )}
      </ScrollArea>

      <VideoPlayerModal clip={playerClip} open={!!playerClip} onClose={() => setPlayerClip(null)} />
    </div>
  );
}

export default memo(ClipGallery);
