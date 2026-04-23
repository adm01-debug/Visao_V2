import { Tables, TablesInsert } from '@/integrations/supabase/types';

export type DbPerson = Tables<'registered_persons'>;
export type DbPersonInsert = TablesInsert<'registered_persons'>;
export type DbRecognitionLog = Tables<'recognition_logs'>;

export type ViewMode = 'grid' | 'list';

export interface Filters {
  search: string;
  activeOnly: boolean;
  [key: string]: unknown;
}

export interface FaceEncoding {
  primaryFace?: {
    quality: number;
    confidence: number;
    attributes?: {
      age?: number;
      gender?: string;
    };
  };
  encoding?: number[];
}
