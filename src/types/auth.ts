export interface User { id: string; email: string; name?: string; avatar?: string; role: UserRole; createdAt: string; }
export type UserRole = "admin" | "operator" | "viewer";
export interface Session { user: User; accessToken: string; refreshToken: string; expiresAt: number; }
export interface LoginCredentials { email: string; password: string; }
export interface RegisterCredentials extends LoginCredentials { name: string; confirmPassword: string; }
