// Database Types - Projeto VISÃO
// Tipagem forte para operações de banco de dados

import type { Database as SupabaseDB } from "./supabase";

export type Database = SupabaseDB;
export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;

export type TableRow<T extends TableName> = Tables[T]["Row"];
export type TableInsert<T extends TableName> = Tables[T]["Insert"];
export type TableUpdate<T extends TableName> = Tables[T]["Update"];

export type QueryResult<T> = {
  data: T | null;
  error: Error | null;
};

export type QueryListResult<T> = {
  data: T[];
  error: Error | null;
  count: number | null;
};

export type FilterValue = string | number | boolean | Date | string[] | number[] | null;

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "is"
  | "contains"
  | "containedBy"
  | "overlaps";

export interface DatabaseFilter {
  column: string;
  operator: FilterOperator;
  value: FilterValue;
}

export interface DatabaseQuery {
  filters?: DatabaseFilter[];
  orderBy?: {
    column: string;
    ascending?: boolean;
  };
  limit?: number;
  offset?: number;
  select?: string;
}

export interface DatabaseTransaction {
  queries: Array<{
    table: TableName;
    operation: "insert" | "update" | "delete";
    data?: Record<string, FilterValue>;
    filter?: DatabaseFilter;
  }>;
}

