export interface Vehicle {
  id: string;
  plate: string;
  type: 'car' | 'motorcycle' | 'truck' | 'bus' | 'unknown';
  color?: string;
  make?: string;
  model?: string;
  status: 'allowed' | 'blocked' | 'unknown';
  lastSeenAt?: string;
  lastSeenCameraId?: string;
  createdAt: string;
}
export type VehicleType = Vehicle['type'];
