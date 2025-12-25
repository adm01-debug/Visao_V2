export interface Person {
  id: string;
  name: string;
  type: 'known' | 'unknown' | 'vip' | 'blocked';
  faceEncoding?: string;
  imageUrl?: string;
  notes?: string;
  lastSeenAt?: string;
  lastSeenCameraId?: string;
  createdAt: string;
}

export type PersonType = Person['type'];
