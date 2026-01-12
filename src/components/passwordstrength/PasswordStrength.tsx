import React from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const levels = [
    { label: 'Muito fraca', color: 'bg-red-500' },
    { label: 'Fraca', color: 'bg-orange-500' },
    { label: 'Regular', color: 'bg-yellow-500' },
    { label: 'Boa', color: 'bg-lime-500' },
    { label: 'Forte', color: 'bg-green-500' },
  ];

  return { score, ...levels[Math.min(score, 4)] };
}

export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const { score, label, color } = getStrength(password);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className={cn('h-1 flex-1 rounded', i < score ? color : 'bg-gray-200')} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default PasswordStrength;
