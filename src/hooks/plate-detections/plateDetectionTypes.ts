export interface PlateDetection {
  id: string;
  plate: string;
  confidence: number;
  camera_id: string | null;
  camera_name: string;
  image_url: string | null;
  vehicle_type: string;
  status: 'authorized' | 'unauthorized' | 'unknown' | 'blacklist';
  direction: string | null;
  timestamp: Date;
  created_at: Date;
}

export interface RegisteredPlate {
  id: string;
  plate: string;
  owner_name: string | null;
  vehicle_type: string;
  color: string | null;
  notes: string | null;
  list_type: 'whitelist' | 'blacklist' | 'visitor';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface PlateDetectionInsert {
  plate: string;
  confidence: number;
  camera_id?: string | null;
  camera_name: string;
  image_url?: string | null;
  vehicle_type?: string;
  status: string;
  direction?: string | null;
}

export interface RegisteredPlateInsert {
  plate: string;
  owner_name?: string;
  vehicle_type?: string;
  color?: string;
  notes?: string;
  list_type: 'whitelist' | 'blacklist' | 'visitor';
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
}

export const TELEGRAM_CONFIG_KEY = 'visao-telegram-config';
export const ALERT_COOLDOWN_MS = 30000;
