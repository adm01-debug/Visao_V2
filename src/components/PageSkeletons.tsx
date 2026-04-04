/**
 * VISÃO - Page Skeletons (Refactored - barrel export)
 */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Individual page skeletons
export { DashboardSkeleton } from './skeletons/DashboardSkeleton';
export { CamerasSkeleton } from './skeletons/CamerasSkeleton';
export { AlertsSkeleton } from './skeletons/AlertsSkeleton';
export { PeopleSkeleton } from './skeletons/PeopleSkeleton';
export { ZonesSkeleton } from './skeletons/ZonesSkeleton';
export { RecordingsSkeleton } from './skeletons/RecordingsSkeleton';
export { AnalyticsSkeleton } from './skeletons/AnalyticsSkeleton';
export { SecuritySkeleton } from './skeletons/SecuritySkeleton';
export { SettingsSkeleton } from './skeletons/SettingsSkeleton';

// Generic skeletons
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 rounded-lg border', className)}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1"><Skeleton className="h-4 w-3/4 mb-1" /><Skeleton className="h-3 w-1/2" /></div>
      </div>
      <Skeleton className="h-20 w-full rounded" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border">
      <div className="p-4 border-b bg-muted/50">
        <div className="flex gap-4">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}</div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 border-b last:border-0">
          <div className="flex gap-4 items-center">{[...Array(5)].map((_, j) => <Skeleton key={j} className="h-4 flex-1" />)}</div>
        </div>
      ))}
    </div>
  );
}

// Page router
interface PageSkeletonProps {
  type?: 'dashboard' | 'cameras' | 'alerts' | 'people' | 'zones' | 'recordings' | 'analytics' | 'security' | 'settings';
}

export function PageSkeleton({ type = 'dashboard' }: PageSkeletonProps) {
  // Dynamic import would be overkill for skeletons; use lazy map
  const { DashboardSkeleton } = require('./skeletons/DashboardSkeleton');
  const { CamerasSkeleton } = require('./skeletons/CamerasSkeleton');
  const { AlertsSkeleton } = require('./skeletons/AlertsSkeleton');
  const { PeopleSkeleton } = require('./skeletons/PeopleSkeleton');
  const { ZonesSkeleton } = require('./skeletons/ZonesSkeleton');
  const { RecordingsSkeleton } = require('./skeletons/RecordingsSkeleton');
  const { AnalyticsSkeleton } = require('./skeletons/AnalyticsSkeleton');
  const { SecuritySkeleton } = require('./skeletons/SecuritySkeleton');
  const { SettingsSkeleton } = require('./skeletons/SettingsSkeleton');

  const map: Record<string, React.FC> = {
    dashboard: DashboardSkeleton, cameras: CamerasSkeleton, alerts: AlertsSkeleton,
    people: PeopleSkeleton, zones: ZonesSkeleton, recordings: RecordingsSkeleton,
    analytics: AnalyticsSkeleton, security: SecuritySkeleton, settings: SettingsSkeleton,
  };
  const Component = map[type] || DashboardSkeleton;
  return <Component />;
}

export const PageSkeletons = {
  Dashboard: () => { const { DashboardSkeleton } = require('./skeletons/DashboardSkeleton'); return <DashboardSkeleton />; },
  Cameras: () => { const { CamerasSkeleton } = require('./skeletons/CamerasSkeleton'); return <CamerasSkeleton />; },
  Alerts: () => { const { AlertsSkeleton } = require('./skeletons/AlertsSkeleton'); return <AlertsSkeleton />; },
  People: () => { const { PeopleSkeleton } = require('./skeletons/PeopleSkeleton'); return <PeopleSkeleton />; },
  Zones: () => { const { ZonesSkeleton } = require('./skeletons/ZonesSkeleton'); return <ZonesSkeleton />; },
  Recordings: () => { const { RecordingsSkeleton } = require('./skeletons/RecordingsSkeleton'); return <RecordingsSkeleton />; },
  Analytics: () => { const { AnalyticsSkeleton } = require('./skeletons/AnalyticsSkeleton'); return <AnalyticsSkeleton />; },
  Security: () => { const { SecuritySkeleton } = require('./skeletons/SecuritySkeleton'); return <SecuritySkeleton />; },
  Settings: () => { const { SettingsSkeleton } = require('./skeletons/SettingsSkeleton'); return <SettingsSkeleton />; },
  Card: CardSkeleton,
  Table: TableSkeleton,
};

export default PageSkeleton;
