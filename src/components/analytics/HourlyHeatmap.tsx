export interface HourlyDistribution {
  hour: number;
  alerts: number;
  activity: number;
}

export function HourlyHeatmap({ data }: { data: HourlyDistribution[] }) {
  const maxAlerts = Math.max(...data.map(d => d.alerts), 1);

  return (
    <div className="grid grid-cols-12 gap-1">
      {data.map((item, index) => {
        const intensity = item.alerts / maxAlerts;
        return (
          <div
            key={index}
            className="aspect-square rounded flex items-center justify-center text-[10px] font-medium transition-all hover:scale-110 cursor-default"
            style={{
              backgroundColor: `hsl(var(--destructive) / ${Math.max(intensity * 0.8, 0.1)})`,
              color: intensity > 0.5 ? 'white' : 'inherit',
            }}
            title={`${item.hour}h: ${item.alerts} alertas`}
          >
            {item.hour}
          </div>
        );
      })}
    </div>
  );
}
