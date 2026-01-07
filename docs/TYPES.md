# 📝 Types Reference - Projeto VISÃO

## Tipos TypeScript

---

## 1. Camera Types

```typescript
interface Camera {
  id: string;
  name: string;
  rtsp_url: string;
  status: 'online' | 'offline' | 'error';
  location?: { lat: number; lng: number };
  created_at: string;
  updated_at: string;
}

type CameraStatus = Camera['status'];
```

---

## 2. Alert Types

```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  camera_id: string;
  image_url?: string;
  acknowledged: boolean;
  created_at: string;
}

type AlertType = 
  | 'intrusion'
  | 'blacklist'
  | 'ppe_missing'
  | 'zone_violation'
  | 'plate_detected';

type AlertSeverity = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';
```

---

## 3. Recognition Types

```typescript
interface Person {
  id: string;
  name: string;
  group: PersonGroup;
  encoding: number[];
  images: string[];
}

type PersonGroup = 
  | 'employees'
  | 'vip'
  | 'blacklist'
  | 'unknown';

interface RecognitionMatch {
  person_id: string;
  confidence: number;
  timestamp: string;
}
```

---

## 4. Zone Types

```typescript
interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  camera_id: string;
  polygon: Point[];
  config: ZoneConfig;
}

type ZoneType = 
  | 'restricted'
  | 'counting'
  | 'tripwire'
  | 'dwell';

interface Point {
  x: number;
  y: number;
}
```

---

## 5. Recording Types

```typescript
interface Recording {
  id: string;
  camera_id: string;
  start_time: string;
  end_time?: string;
  duration: number;
  file_url: string;
  type: RecordingType;
}

type RecordingType = 
  | 'continuous'
  | 'event'
  | 'manual'
  | 'scheduled';
```

---

## 6. User Types

```typescript
interface User {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  avatar_url?: string;
}

type UserRole = 
  | 'admin'
  | 'manager'
  | 'operator'
  | 'viewer';
```

---

## 7. Notification Types

```typescript
interface NotificationConfig {
  email_enabled: boolean;
  push_enabled: boolean;
  telegram_enabled: boolean;
  telegram_chat_id?: string;
  alert_types: AlertType[];
}
```

---

## 8. API Response Types

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
  meta: PaginationMeta;
}
```

---

## 9. Supabase Types

```bash
# Gerar tipos do banco
npx supabase gen types typescript --local > src/types/supabase.ts
```

---

## 10. Utility Types

```typescript
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type AsyncState<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
};
```

---

**Última atualização:** 06/01/2026
