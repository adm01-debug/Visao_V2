export interface CreateCameraDTO { name: string; url: string; location?: string; settings?: Record<string, any>; }
export interface UpdateCameraDTO { name?: string; url?: string; location?: string; settings?: Record<string, any>; }

export interface CreateAlertDTO { type: string; severity: 'low' | 'medium' | 'high' | 'critical'; message: string; cameraId?: string; metadata?: Record<string, any>; }
export interface UpdateAlertDTO { status?: 'active' | 'acknowledged' | 'resolved'; notes?: string; }

export interface CreateUserDTO { email: string; name: string; password: string; role: string; }
export interface UpdateUserDTO { name?: string; email?: string; role?: string; avatar?: string; }

export interface LoginDTO { email: string; password: string; remember?: boolean; }
export interface RegisterDTO extends CreateUserDTO { confirmPassword: string; }

export interface PaginationDTO { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; }
export interface SearchDTO extends PaginationDTO { query?: string; filters?: Record<string, any>; }
