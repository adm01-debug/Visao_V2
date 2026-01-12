import React from 'react';
import { cn } from '@/lib/utils';
import { Building2, Camera, AlertTriangle } from 'lucide-react';

interface Site {
  id: string;
  name: string;
  address?: string;
  cameraCount: number;
  alertCount: number;
  status: 'online' | 'partial' | 'offline';
}

interface SiteListingProps {
  sites: Site[];
  selectedId?: string;
  onSiteClick?: (site: Site) => void;
  className?: string;
}

const statusColors = { online: 'bg-green-500', partial: 'bg-yellow-500', offline: 'bg-red-500' };

export function SiteListing({ sites, selectedId, onSiteClick, className }: SiteListingProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {sites.map(site => (
        <button key={site.id} onClick={() => onSiteClick?.(site)}
          className={cn('w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
            site.id === selectedId ? 'bg-primary/10 border-primary' : 'hover:bg-accent')}>
          <Building2 className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{site.name}</span>
              <div className={cn('w-2 h-2 rounded-full', statusColors[site.status])} />
            </div>
            {site.address && <p className="text-xs text-muted-foreground">{site.address}</p>}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1"><Camera className="h-4 w-4" />{site.cameraCount}</span>
            {site.alertCount > 0 && <span className="flex items-center gap-1 text-yellow-500"><AlertTriangle className="h-4 w-4" />{site.alertCount}</span>}
          </div>
        </button>
      ))}
    </div>
  );
}

export default SiteListing;
