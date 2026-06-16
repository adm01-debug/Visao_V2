export interface AlertsByType {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface DonutChartProps {
  data: AlertsByType[];
  size?: number;
}

export function DonutChart({ data, size = 160 }: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.count, 0);

  const segments = data.map((item, i) => {
    const angle = (item.count / total) * 360;
    const startAngle = data
      .slice(0, i)
      .reduce((acc, prev) => acc + (prev.count / total) * 360, 0);
    return { ...item, startAngle, angle };
  });

  const getArcPath = (startAngle: number, angle: number, innerRadius: number, outerRadius: number) => {
    const startRad = (startAngle - 90) * Math.PI / 180;
    const endRad = (startAngle + angle - 90) * Math.PI / 180;
    const x1 = size/2 + outerRadius * Math.cos(startRad);
    const y1 = size/2 + outerRadius * Math.sin(startRad);
    const x2 = size/2 + outerRadius * Math.cos(endRad);
    const y2 = size/2 + outerRadius * Math.sin(endRad);
    const x3 = size/2 + innerRadius * Math.cos(endRad);
    const y3 = size/2 + innerRadius * Math.sin(endRad);
    const x4 = size/2 + innerRadius * Math.cos(startRad);
    const y4 = size/2 + innerRadius * Math.sin(startRad);
    const largeArc = angle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        {segments.map((segment, index) => (
          <path key={index} d={getArcPath(segment.startAngle, segment.angle, size * 0.25, size * 0.45)} fill={segment.color} className="transition-all hover:opacity-80" />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{total}</span>
        <span className="text-xs text-muted-foreground">Total</span>
      </div>
    </div>
  );
}
