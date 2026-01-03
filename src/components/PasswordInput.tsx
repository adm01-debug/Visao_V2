/**
 * VISÃO - Sistema de Vigilância Inteligente
 * PasswordInput Component
 */

import { memo, useState, forwardRef } from 'react';
import { Eye, EyeOff, Lock, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const defaultRequirements: PasswordRequirement[] = [
  { label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { label: 'Uma letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Uma letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Um número', test: (p) => /[0-9]/.test(p) },
  { label: 'Um caractere especial', test: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  requirements?: PasswordRequirement[];
  error?: string;
  onStrengthChange?: (strength: number) => void;
}

const PasswordInputComponent = forwardRef<HTMLInputElement, PasswordInputProps>(({
  label = 'Senha',
  showStrengthIndicator = false,
  showRequirements = false,
  requirements = defaultRequirements,
  error,
  onStrengthChange,
  className,
  value = '',
  ...props
}, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const password = String(value);
  
  const metRequirements = requirements.filter(req => req.test(password));
  const strength = Math.round((metRequirements.length / requirements.length) * 100);
  
  const getStrengthColor = () => {
    if (strength < 40) return 'bg-destructive';
    if (strength < 70) return 'bg-warning';
    return 'bg-green-500';
  };
  
  const getStrengthLabel = () => {
    if (strength < 40) return 'Fraca';
    if (strength < 70) return 'Média';
    return 'Forte';
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={props.id} className="flex items-center gap-2">
          <Lock className="w-4 h-4" />
          {label}
        </Label>
      )}
      
      <div className="relative">
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(
            'pr-10',
            error && 'border-destructive',
            className
          )}
          value={value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex={-1}
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          ) : (
            <Eye className="w-4 h-4 text-muted-foreground" />
          )}
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {showStrengthIndicator && password.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Força da senha</span>
            <span className={cn(
              "font-medium",
              strength < 40 ? 'text-destructive' : strength < 70 ? 'text-warning' : 'text-green-500'
            )}>
              {getStrengthLabel()}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div 
              className={cn("h-full transition-all duration-300", getStrengthColor())}
              style={{ width: `${strength}%` }}
            />
          </div>
        </div>
      )}
      
      {showRequirements && isFocused && (
        <div className="space-y-1 p-3 rounded-lg bg-secondary/50 text-sm">
          {requirements.map((req, index) => {
            const isMet = req.test(password);
            return (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-2 transition-colors",
                  isMet ? 'text-green-500' : 'text-muted-foreground'
                )}
              >
                {isMet ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {req.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

PasswordInputComponent.displayName = 'PasswordInput';

export const PasswordInput = memo(PasswordInputComponent);
