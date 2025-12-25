import { ReactNode, HTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';

export interface BaseProps { className?: string; style?: React.CSSProperties; children?: ReactNode; }
export interface WithChildren { children: ReactNode; }
export interface WithClassName { className?: string; }

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseProps { variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'; size?: 'sm' | 'md' | 'lg'; loading?: boolean; leftIcon?: ReactNode; rightIcon?: ReactNode; }
export interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseProps { label?: string; error?: string; hint?: string; leftAddon?: ReactNode; rightAddon?: ReactNode; }
export interface CardProps extends HTMLAttributes<HTMLDivElement>, BaseProps { title?: string; description?: string; footer?: ReactNode; hoverable?: boolean; }

export interface ModalProps extends BaseProps { open: boolean; onClose: () => void; title?: string; description?: string; size?: 'sm' | 'md' | 'lg' | 'xl'; }
export interface TableProps<T> extends BaseProps { data: T[]; columns: { key: keyof T; label: string; render?: (value: any, item: T) => ReactNode }[]; loading?: boolean; emptyMessage?: string; }
