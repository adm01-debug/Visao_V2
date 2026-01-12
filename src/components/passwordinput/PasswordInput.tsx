import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  error?: boolean;
}

export function PasswordInput({ error, className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', error && 'border-destructive', className)} {...props} />
      <button type="button" onClick={() => setVisible(!visible)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default PasswordInput;
