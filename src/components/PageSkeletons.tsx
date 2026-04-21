/**
 * VISÃO - Page Skeletons (Refactored - barrel export)
 */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export { DashboardSkeleton } from './skeletons/DashboardSkeleton';
export { CamerasSkeleton } from './skeletons/CamerasSkeleton';
export { AlertsSkeleton } from './skeletons/AlertsSkeleton';
export { PeopleSkeleton } from './skeletons/PeopleSkeleton';
export { ZonesSkeleton } from './skeletons/ZonesSkeleton';
export { RecordingsSkeleton } from './skeletons/RecordingsSkeleton';
export { AnalyticsSkeleton } from './skeletons/AnalyticsSkeleton';
export { SecuritySkeleton } from './skeletons/SecuritySkeleton';
export { SettingsSkeleton } from './skeletons/SettingsSkeleton';

import { DashboardSkeleton } from './skeletons/DashboardSkeleton';
import { CamerasSkeleton } from './skeletons/CamerasSkeleton';
import { AlertsSkeleton } from './skeletons/AlertsSkeleton';
import { PeopleSkeleton } from './skeletons/PeopleSkeleton';
import { ZonesSkeleton } from './skeletons/ZonesSkeleton';
import { RecordingsSkeleton } from './skeletons/RecordingsSkeleton';
import { AnalyticsSkeleton } from './skeletons/AnalyticsSkeleton';
import { SecuritySkeleton } from './skeletons/SecuritySkeleton';
import { SettingsSkeleton } from './skeletons/SettingsSkeleton';

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Carregando cartão…" className={cn('p-4 rounded-lg border', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1"><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></div>
      </div>
      <Skeleton className="h-20 w-full rounded" />
      <span className="sr-only">Carregando cartão…</span>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" aria-label="Carregando tabela…" className="rounded-lg border">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}</div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 border-b last:border-0">
          <div className="flex gap-4 items-center">{[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}</div>
        </div>
      ))}
      <span className="sr-only">Carregando tabela…</span>
    </div>
  );
}

interface PageSkeletonProps {
  type?: 'dashboard' | 'cameras' | 'alerts' | 'people' | 'zones' | 'recordings' | 'analytics' | 'security' | 'settings';
}

const SKELETON_MAP: Record<string, React.FC> = {
  dashboard: DashboardSkeleton, cameras: CamerasSkeleton, alerts: AlertsSkeleton,
  people: PeopleSkeleton, zones: ZonesSkeleton, recordings: RecordingsSkeleton,
  analytics: AnalyticsSkeleton, security: SecuritySkeleton, settings: SettingsSkeleton,
};

export function PageSkeleton({ type = 'dashboard' }: PageSkeletonProps) {
  const Component = SKELETON_MAP[type] || DashboardSkeleton;
  return <Component />;
}

export const PageSkeletons = {
  Dashboard: DashboardSkeleton, Cameras: CamerasSkeleton, Alerts: AlertsSkeleton,
  People: PeopleSkeleton, Zones: ZonesSkeleton, Recordings: RecordingsSkeleton,
  Analytics: AnalyticsSkeleton, Security: SecuritySkeleton, Settings: SettingsSkeleton,
  Card: CardSkeleton, Table: TableSkeleton,
};

export default PageSkeleton;
