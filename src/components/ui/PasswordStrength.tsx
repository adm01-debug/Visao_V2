import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
}

const getStrength = (pw: string): { level: number; label: string } => {
  if (!pw) return { level: 0, label: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Fraca' };
  if (score <= 2) return { level: 2, label: 'Razoável' };
  if (score <= 3) return { level: 3, label: 'Boa' };
  return { level: 4, label: 'Forte' };
};

const colors = ['', 'bg-destructive', 'bg-warning', 'bg-primary', 'bg-success'];
const textColors = ['', 'text-destructive', 'text-warning', 'text-primary', 'text-success'];

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { level, label } = useMemo(() => getStrength(password), [password]);
  if (!password) return null;

  return (
    <div className="space-y-1.5 mt-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i <= level ? colors[level] : 'bg-muted'
            )}
          />
        ))}
      </div>
      <p className={cn('text-[10px] font-medium transition-colors', textColors[level])}>
        Força: {label}
      </p>
    </div>
  );
}
