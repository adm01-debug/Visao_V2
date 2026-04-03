import { Database } from '@/integrations/supabase/types';
export type Tables = Database['public']['Tables'];
export type Enums = Database['public']['Enums'];
export type DbCamera = Tables['cameras']['Row'];
export type DbAlert = Tables['alerts']['Row'];
export type DbRecording = Tables['recordings']['Row'];
