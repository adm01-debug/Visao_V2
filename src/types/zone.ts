export interface Zone {
  id: string;
  name: string;
  type: 'restricted' | 'monitored' | 'safe';
  polygon: { x: number; y: number }[];
  cameraId: string;
  active: boolean;
  alertOnEntry: boolean;
  alertOnExit: boolean;
  createdAt: string;
}

export type ZoneType = Zone['type'];
