export const getBadgeClasses = (variant?: string) => {
  switch (variant) {
    case 'destructive':
      return 'bg-[hsl(var(--severity-critical))]/12 text-[hsl(var(--severity-critical-soft))] border border-[hsl(var(--severity-critical))]/20';
    case 'warning':
      return 'bg-[hsl(var(--severity-medium))]/12 text-[hsl(var(--severity-medium))] border border-[hsl(var(--severity-medium))]/20';
    case 'success':
      return 'bg-success/12 text-success border border-success/20';
    default:
      return 'bg-primary/10 text-primary border border-primary/20';
  }
};
