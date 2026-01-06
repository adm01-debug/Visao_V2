# 📝 Types Reference - Projeto VISÃO

## Tipagens TypeScript

---

## 1. Entidades Principais

### Camera
```typescript
interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  status: 'online' | 'offline' | 'error';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  created_at: string;
  updated_at: string;
}
```

### Alert
```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  camera_id: string;
  message: string;
  image_url?: string;
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

type AlertType = 
  | 'intrusion'
  | 'blacklist_match'
  | 'ppe_missing'
  | 'zone_violation'
  | 'plate_detected';
```

### Person
```typescript
interface Person {
  id: string;
  name: string;
  group: 'employees' | 'visitors' | 'blacklist' | 'vip';
  face_encoding: number[];
  images: string[];
  notes?: string;
  created_at: string;
}
```

### Zone
```typescript
interface Zone {
  id: string;
  name: string;
  type: 'restricted' | 'counting' | 'tripwire' | 'dwell';
  camera_id: string;
  polygon: Point[];
  color: string;
  alert_enabled: boolean;
  created_at: string;
}

interface Point {
  x: number;
  y: number;
}
```

---

## 2. Recognition

```typescript
interface RecognitionMatch {
  person_id: string;
  person_name: string;
  confidence: number;
  bounding_box: BoundingBox;
  camera_id: string;
  timestamp: string;
}

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FaceDetection {
  id: string;
  box: BoundingBox;
  landmarks?: FaceLandmarks;
  encoding?: number[];
  expressions?: FaceExpressions;
}
```

---

## 3. Streaming

```typescript
interface StreamConfig {
  url: string;
  type: 'hls' | 'rtsp' | 'webrtc';
  quality: 'low' | 'medium' | 'high';
  lowLatency: boolean;
}

interface Recording {
  id: string;
  camera_id: string;
  start_time: string;
  end_time: string;
  duration: number;
  file_url: string;
  thumbnail_url: string;
  size_bytes: number;
}
```

---

## 4. Analytics

```typescript
interface DashboardStats {
  total_alerts: number;
  alerts_by_severity: Record<string, number>;
  cameras_online: number;
  cameras_total: number;
  recognitions_today: number;
}

interface TimeSeriesData {
  timestamp: string;
  value: number;
}
```

---

## 5. Notificações

```typescript
interface NotificationConfig {
  email_enabled: boolean;
  email_address?: string;
  push_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id?: string;
  alert_types: AlertType[];
  severities: string[];
}
```

---

## 6. API Responses

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
```

---

## 7. Supabase Types

```bash
# Gerar tipos
supabase gen types typescript --local > src/types/supabase.ts
```

```typescript
import { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type Camera = Tables['cameras']['Row'];
type Alert = Tables['alerts']['Row'];
```

---

**Última atualização:** 06/01/2026
