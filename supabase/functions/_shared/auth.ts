// Shared Auth - Supabase Edge Functions
// Autenticação compartilhada com tipagem forte

export interface JWTPayload {
  sub: string;
  email?: string;
  role?: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  user_metadata?: UserMetadata;
  app_metadata?: AppMetadata;
}

export interface UserMetadata {
  full_name?: string;
  avatar_url?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface AppMetadata {
  provider?: string;
  providers?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  metadata: UserMetadata;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

export const verifyToken = async (authHeader: string | null): Promise<AuthResult> => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { success: false, error: 'Invalid token format' };
    }

    const payload: JWTPayload = JSON.parse(atob(parts[1]));

    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return { success: false, error: 'Token expired' };
    }

    const user: AuthUser = {
      id: payload.sub,
      email: payload.email || '',
      role: payload.role || 'authenticated',
      metadata: payload.user_metadata || {},
    };

    return { success: true, user };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Token verification failed',
    };
  }
};

export const requireAuth = async (req: Request): Promise<AuthUser> => {
  const authHeader = req.headers.get('Authorization');
  const result = await verifyToken(authHeader);

  if (!result.success || !result.user) {
    throw new Error(result.error || 'Unauthorized');
  }

  return result.user;
};

export const hasRole = (user: AuthUser, roles: string[]): boolean => {
  return roles.includes(user.role);
};

export const isAdmin = (user: AuthUser): boolean => {
  return hasRole(user, ['admin', 'service_role']);
};

export default {
  verifyToken,
  requireAuth,
  hasRole,
  isAdmin,
};
