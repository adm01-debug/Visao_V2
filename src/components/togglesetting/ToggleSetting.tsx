import React from 'react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface ToggleSettingProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function ToggleSetting({ label, description, checked, onChange, disabled = false, className }: ToggleSettingProps) {
  return (
    <div className={cn('flex items-center justify-between py-3', className)}>
      <div>
        <p className="font-medium">{label}</p>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
    </div>
  );
}

export default ToggleSetting;
