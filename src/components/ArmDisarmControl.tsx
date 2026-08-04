import React from 'react';
import { Shield, ShieldOff, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useArmDisarm } from '@/hooks/useArmDisarm';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ArmDisarmControlProps {
  cameraId: string;
  cameraName: string;
  compact?: boolean;
  className?: string;
}

export function ArmDisarmControl({
  cameraId,
  cameraName,
  compact = false,
  className,
}: ArmDisarmControlProps) {
  const { getCameraState, armCamera, disarmCamera } = useArmDisarm();
  const state = getCameraState(cameraId);

  const isArmed = state === 'armed';
  const isScheduled = state === 'scheduled';

  const handleToggle = () => {
    if (isArmed || isScheduled) {
      disarmCamera.mutate(cameraId);
    } else {
      armCamera.mutate({ cameraId });
    }
  };

  const icon = isArmed ? (
    <Shield className="h-4 w-4" />
  ) : isScheduled ? (
    <Clock className="h-4 w-4" />
  ) : (
    <ShieldOff className="h-4 w-4" />
  );
  const label = isArmed ? 'Armada' : isScheduled ? 'Agendada' : 'Desarmada';
  const buttonVariant = isArmed ? 'default' : isScheduled ? 'secondary' : 'outline';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={buttonVariant}
              size="icon"
              onClick={handleToggle}
              disabled={armCamera.isPending || disarmCamera.isPending}
              className={cn(
                isScheduled && 'bg-accent text-accent-foreground hover:bg-accent/90',
                className
              )}
              aria-label="Ação"
            >
              {icon}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>
              {cameraName}: {label}
            </p>
            <p className="text-xs text-muted-foreground">
              Clique para {isArmed ? 'desarmar' : 'armar'}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant={buttonVariant}
      onClick={handleToggle}
      disabled={armCamera.isPending || disarmCamera.isPending}
      className={cn(
        'gap-2',
        isScheduled && 'bg-accent text-accent-foreground hover:bg-accent/90',
        className
      )}
    >
      {icon}
      {label}
    </Button>
  );
}

export default ArmDisarmControl;
