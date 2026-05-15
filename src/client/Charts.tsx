import React from 'react';

interface ChartData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: ChartData[];
  title: string;
  color?: string;
}

/**
 * A pure SVG bar chart for ModVigil.
 * No external dependencies.
 */
export const BarChart: React.FC<BarChartProps> = ({ data, title, color = '#FF4500' }) => {
  const width = 400;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = data.length > 0 ? chartWidth / data.length : 0;

  return (
    <div className="chart-container" style={{ marginBottom: '20px' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#878A8C' }}>{title}</h3>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #EDEFF1' }}>
        <style>{`
          .bar { transition: fill 0.2s, opacity 0.2s; cursor: pointer; }
          .bar:hover { fill: #FF581A; opacity: 0.8; }
        `}</style>
        
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padding + chartHeight * (1 - p);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#EDEFF1" strokeWidth="1" />
              <text x={padding - 5} y={y + 4} textAnchor="end" fontSize="10" fill="#878A8C">
                {Math.round(maxValue * p)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding + i * barWidth + barWidth * 0.1;
          const y = height - padding - barHeight;
          const w = barWidth * 0.8;

          return (
            <g key={i}>
              <rect
                className="bar"
                x={x}
                y={y}
                width={w}
                height={barHeight}
                fill={color}
                rx="2"
              >
                <title>{`${d.label}: ${d.value} actions`}</title>
              </rect>
              <text
                x={x + w / 2}
                y={height - padding + 15}
                textAnchor="middle"
                fontSize="10"
                fill="#878A8C"
                transform={`rotate(45, ${x + w / 2}, ${height - padding + 15})`}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
