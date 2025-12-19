import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Camera, 
  Bell, 
  BarChart3, 
  Settings, 
  Shield,
  Users,
  ChevronLeft
} from 'lucide-react';
import { useState } from 'react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'cameras', label: 'Câmeras', icon: Camera },
  { id: 'alerts', label: 'Alertas', icon: Bell },
  { id: 'analytics', label: 'Relatórios', icon: BarChart3 },
  { id: 'people', label: 'Colaboradores', icon: Users },
  { id: 'security', label: 'Segurança', icon: Shield },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={cn(
      "h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="font-bold text-lg text-sidebar-foreground">VisionAI</h1>
              <p className="text-xs text-muted-foreground">Vigilância Inteligente</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
              activeTab === item.id
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span className="font-medium">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <ChevronLeft className={cn(
            "w-5 h-5 transition-transform duration-300",
            isCollapsed && "rotate-180"
          )} />
          {!isCollapsed && <span className="text-sm">Recolher</span>}
        </button>
      </div>

      {/* Settings */}
      <div className="p-3 border-t border-sidebar-border">
        <button className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-sidebar-accent transition-colors",
        )}>
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Configurações</span>}
        </button>
      </div>
    </aside>
  );
}
