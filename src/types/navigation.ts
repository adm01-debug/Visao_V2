export interface NavItem { label: string; href: string; icon?: string; badge?: string | number; children?: NavItem[]; permission?: string; external?: boolean; }
export interface Breadcrumb { label: string; href?: string; }
export interface Tab { id: string; label: string; icon?: string; disabled?: boolean; badge?: string | number; }

export interface RouteConfig { path: string; element: React.ReactNode; title?: string; permissions?: string[]; layout?: 'default' | 'auth' | 'minimal'; }
export interface NavigationState { currentPath: string; previousPath?: string; params?: Record<string, string>; query?: Record<string, string>; }

export type NavigateOptions = { replace?: boolean; state?: any; };
