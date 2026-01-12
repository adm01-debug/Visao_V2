import React from 'react';

interface DataPoint {
  label: string;
  value: number;
}

interface BarChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}

export function BarChart({ data, width = 400, height = 200, color = '#3b82f6', className }: BarChartProps) {
  if (data.length === 0) return null;

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = chartWidth / data.length - 10;

  return (
    <svg width={width} height={height} className={className}>
      {/* Y axis */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#9ca3af"
        strokeWidth="1"
      />
      
      {/* X axis */}
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#9ca3af"
        strokeWidth="1"
      />
      
      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = (d.value / maxValue) * chartHeight;
        const x = padding.left + i * (chartWidth / data.length) + 5;
        const y = height - padding.bottom - barHeight;
        
        return (
          <g key={i}>
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx="2" />
            <text x={x + barWidth / 2} y={height - padding.bottom + 15} textAnchor="middle" fontSize="10" fill="#6b7280">
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default BarChart;
