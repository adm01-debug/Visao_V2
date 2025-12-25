import type { Database as SupabaseDB } from './supabase';

export type Database = SupabaseDB;
export type Tables = Database['public']['Tables'];
export type TableName = keyof Tables;

export type TableRow<T extends TableName> = Tables[T]['Row'];
export type TableInsert<T extends TableName> = Tables[T]['Insert'];
export type TableUpdate<T extends TableName> = Tables[T]['Update'];

export type QueryResult<T> = { data: T | null; error: Error | null; };
export type QueryListResult<T> = { data: T[]; error: Error | null; count: number | null; };

export interface DatabaseFilter { column: string; operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'ilike' | 'in'; value: any; }
export interface DatabaseQuery { filters?: DatabaseFilter[]; orderBy?: { column: string; ascending?: boolean }; limit?: number; offset?: number; }
