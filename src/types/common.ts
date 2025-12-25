export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = T | null | undefined;

export type ID = string | number;
export type Timestamp = string | Date;

export interface Entity { id: ID; createdAt: Timestamp; updatedAt: Timestamp; }
export interface SoftDeletable { deletedAt?: Timestamp | null; }
export interface Auditable { createdBy?: string; updatedBy?: string; }

export type DeepPartial<T> = { [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]; };
export type RequiredKeys<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface Pagination { page: number; limit: number; total: number; totalPages: number; }
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination; }
export interface SortOptions { field: string; order: 'asc' | 'desc'; }
