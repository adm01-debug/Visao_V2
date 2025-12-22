import { getRelativeTime, formatDuration } from "@/lib/dateUtils";
import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { Camera } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState } from 'react';

interface Alert {
  id: string;
  cameraId: string;
  cameraName: string;
  severity: string;
}

interface AlertsByCameraChartProps {
  alerts: Alert[];
  className?: string;
  onCameraClick?: (cameraId: string) => void;
}

type ChartType = 'bar' | 'pie';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(217, 91%, 60%)',
  'hsl(280, 84%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 70%, 45%)',
  'hsl(330, 80%, 55%)',
];

export function AlertsByCameraChart({ alerts, className = '', onCameraClick }: AlertsByCameraChartProps) {
  const [chartType, setChartType] = useState<ChartType>('bar');

  const chartData = useMemo(() => {
    const cameraMap = new Map<string, { name: string; count: number; critical: number; high: number; medium: number; low: number }>();

    alerts.forEach((alert) => {
      const existing = cameraMap.get(alert.cameraId) || {
        name: alert.cameraName,
        count: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      };

      existing.count++;
      if (alert.severity === 'critical') existing.critical++;
      else if (alert.severity === 'high') existing.high++;
      else if (alert.severity === 'medium') existing.medium++;
      else existing.low++;

      cameraMap.set(alert.cameraId, existing);
    });

    return Array.from(cameraMap.entries())
      .map(([id, data]) => ({
        id,
        name: data.name.length > 15 ? data.name.substring(0, 15) + '...' : data.name,
        fullName: data.name,
        count: data.count,
        critical: data.critical,
        high: data.high,
        medium: data.medium,
        low: data.low,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // Top 8 cameras
  }, [alerts]);

  const totalAlerts = chartData.reduce((sum, d) => sum + d.count, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg text-sm">
          <p className="font-medium text-foreground mb-2">{data.fullName}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{data.count}</span>
            </div>
            {data.critical > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-destructive">Crítico:</span>
                <span>{data.critical}</span>
              </div>
            )}
            {data.high > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-orange-500">Alto:</span>
                <span>{data.high}</span>
              </div>
            )}
            {data.medium > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-yellow-500">Médio:</span>
                <span>{data.medium}</span>
              </div>
            )}
            {data.low > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-green-500">Baixo:</span>
                <span>{data.low}</span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`glass-card p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Alertas por Câmera</h3>
          <span className="text-sm text-muted-foreground">({totalAlerts} alertas)</span>
        </div>

        <Tabs value={chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <TabsList className="h-8">
            <TabsTrigger value="bar" className="text-xs px-3">Barras</TabsTrigger>
            <TabsTrigger value="pie" className="text-xs px-3">Pizza</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {chartData.length === 0 ? (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
          Nenhum alerta registrado
        </div>
      ) : (
        <div className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart 
                data={chartData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                onClick={(data) => {
                  if (data?.activePayload?.[0]?.payload?.id) {
                    onCameraClick?.(data.activePayload[0].payload.id);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                  axisLine={{ stroke: 'hsl(var(--border))' }}
                  tickLine={false}
                  width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.3)' }} />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]}
                  cursor="pointer"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="name"
                  onClick={(data) => {
                    if (data?.id) {
                      onCameraClick?.(data.id);
                    }
                  }}
                  cursor="pointer"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                  wrapperStyle={{ fontSize: '11px' }}
                />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
