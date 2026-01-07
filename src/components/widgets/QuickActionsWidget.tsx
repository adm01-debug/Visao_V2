import React from 'react';
import { 
  Camera, 
  Bell, 
  Video, 
  Users, 
  Settings, 
  Map,
  Plus,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const quickActions = [
  { id: 'cameras', label: 'Câmeras', icon: Camera, route: '/cameras', color: 'text-primary' },
  { id: 'alerts', label: 'Alertas', icon: Bell, route: '/alerts', color: 'text-destructive' },
  { id: 'recordings', label: 'Gravações', icon: Video, route: '/recordings', color: 'text-success' },
  { id: 'people', label: 'Pessoas', icon: Users, route: '/people', color: 'text-warning' },
];

export function QuickActionsWidget() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 gap-2 h-full">
      {quickActions.map((action) => (
        <Button
          key={action.id}
          variant="outline"
          className={cn(
            'h-auto flex-col gap-1 py-3',
            'hover:bg-accent/50',
          )}
          onClick={() => navigate(action.route)}
        >
          <action.icon className={cn('h-5 w-5', action.color)} />
          <span className="text-[10px]">{action.label}</span>
        </Button>
      ))}
    </div>
  );
}
