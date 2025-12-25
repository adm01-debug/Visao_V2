export interface SuccessResponse<T = any> { success: true; data: T; message?: string; }
export interface ErrorResponse { success: false; error: { code: string; message: string; details?: any }; }
export type ApiResult<T> = SuccessResponse<T> | ErrorResponse;

export interface ListResponse<T> { items: T[]; total: number; page: number; limit: number; hasMore: boolean; }
export interface SingleResponse<T> { item: T; }

export interface AuthResponse { user: { id: string; email: string; name: string; role: string }; token: string; refreshToken: string; expiresIn: number; }
export interface RefreshResponse { token: string; expiresIn: number; }

export interface UploadResponse { url: string; filename: string; size: number; mimeType: string; }
export interface DeleteResponse { deleted: boolean; id: string; }
