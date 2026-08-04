import { memo } from 'react';
import { AlertTriangle, Activity, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ExportMenu } from '@/components/ExportMenu';
import { LazyCameraMap as CameraMap } from '@/components/LazyCameraMap';
import { StreamCameraCard } from './StreamCameraCard';
import { UICameraData } from './types';
import { CameraLayout } from '@/components/CameraLayoutControls';
import type { DbCamera } from '@/hooks/useCameras';
import { exportCameras } from '@/lib/exportUtils';

interface DashboardCameraGridProps {
  uiCameras: UICameraData[];
  priorityCameras: UICameraData[];
  normalCameras: UICameraData[];
  onlineCameras: number;
  totalCameras: number;
  cameras: DbCamera[];
  cameraLayout: CameraLayout;
  enableStreams: boolean;
  showMap: boolean;
  aiAnalysisCameras: Set<string>;
  onSelectCamera: (camera: UICameraData) => void;
  onToggleAiAnalysis: (cameraId: string, active: boolean) => void;
}

function getCameraGridClass(layout: CameraLayout) {
  switch (layout) {
    case '2x2':
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
    case '3x3':
      return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';
    case 'list':
      return 'flex flex-col gap-2';
    default:
      return 'grid grid-cols-1 sm:grid-cols-2 gap-4';
  }
}

function DashboardCameraGridComponent({
  uiCameras,
  priorityCameras,
  normalCameras,
  onlineCameras,
  totalCameras,
  cameras,
  cameraLayout,
  enableStreams,
  showMap,
  aiAnalysisCameras,
  onSelectCamera,
  onToggleAiAnalysis,
}: DashboardCameraGridProps) {
  const gridClass = getCameraGridClass(cameraLayout);

  return (
    <>
      {showMap && uiCameras.some((c) => c.latitude && c.longitude) && (
        <div className="h-64 rounded-lg overflow-hidden border">
          <CameraMap
            cameras={uiCameras.filter((c) => c.latitude && c.longitude)}
            onCameraClick={(id) => {
              const cam = uiCameras.find((c) => c.id === id);
              if (cam) onSelectCamera(cam);
            }}
          />
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Monitoramento</h2>
          <Badge variant="secondary" className="ml-2">
            {onlineCameras}/{totalCameras} online
          </Badge>
        </div>
        <ExportMenu
          onExportCSV={() => exportCameras(cameras, 'csv')}
          onExportPDF={() => exportCameras(cameras, 'pdf')}
          disabled={cameras.length === 0}
        />
      </div>

      {priorityCameras.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-semibold text-foreground">Câmeras com Alertas</h2>
          </div>
          <div className={gridClass}>
            {priorityCameras.map((camera) => (
              <StreamCameraCard
                key={camera.id}
                camera={camera}
                onClick={() => onSelectCamera(camera)}
                compact={cameraLayout === 'list'}
                showStream={enableStreams}
                aiAnalysisActive={aiAnalysisCameras.has(camera.id)}
                onToggleAiAnalysis={onToggleAiAnalysis}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Todas as Câmeras</h2>
          </div>
          <button className="text-sm text-primary hover:underline">Ver todas</button>
        </div>
        <div className={gridClass}>
          {normalCameras.slice(0, cameraLayout === '3x3' ? 9 : 6).map((camera) => (
            <StreamCameraCard
              key={camera.id}
              camera={camera}
              onClick={() => onSelectCamera(camera)}
              compact={cameraLayout === 'list'}
              showStream={enableStreams}
              aiAnalysisActive={aiAnalysisCameras.has(camera.id)}
              onToggleAiAnalysis={onToggleAiAnalysis}
            />
          ))}
        </div>
      </div>
    </>
  );
}

export const DashboardCameraGrid = memo(DashboardCameraGridComponent);
