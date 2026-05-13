import { lazy, Suspense } from 'react';
import { CameraMapSkeleton } from './CameraMapSkeleton';

const CameraMap = lazy(() =>
  import('./CameraMap').then(mod => ({ default: mod.CameraMap }))
);

interface LazyCameraMapProps {
  cameras: Array<{
    id: string;
    name: string;
    location: string;
    status: 'online' | 'offline' | 'alert' | 'warning';
    latitude?: number | null;
    longitude?: number | null;
  }>;
  onCameraClick?: (cameraId: string) => void;
  className?: string;
}

export function LazyCameraMap(props: LazyCameraMapProps) {
  return (
    <Suspense fallback={<CameraMapSkeleton className={props.className} />}>
      <CameraMap {...props} />
    </Suspense>
  );
}
