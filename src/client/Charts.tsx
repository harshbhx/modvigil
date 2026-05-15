/** @jsxRuntime classic */
/** @jsx React.createElement */
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
 * A "Beast Mode" SVG bar chart for ModVigil.
 * High fidelity, animated, and interactive.
 */
export const BarChart: React.FC<BarChartProps> = ({ data, title, color = 'var(--color-primary)' }) => {
  const width = 450;
  const height = 240;
  const paddingX = 40;
  const paddingY = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barWidth = data.length > 0 ? (chartWidth / data.length) * 0.7 : 0;
  const barGap = data.length > 0 ? (chartWidth / data.length) * 0.3 : 0;

  return (
    <div className="chart-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-primary)' }}>{title}</div>
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: 'var(--color-neutral-background-strong)', borderRadius: '12px' }}>
        <style>{`
          .bar { transition: height 0.5s ease-out, y 0.5s ease-out, fill 0.2s; cursor: pointer; }
          .bar:hover { fill: var(--color-primary-hover); }
          .grid-line { stroke: var(--color-neutral-border); stroke-dasharray: 4, 4; }
          .axis-text { fill: var(--color-neutral-content-weak); font-weight: 600; }
        `}</style>
        
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = paddingY + chartHeight * (1 - p);
          return (
            <g key={i}>
              <line className="grid-line" x1={paddingX} y1={y} x2={width - paddingX} y2={y} strokeWidth="1" />
              <text className="axis-text" x={paddingX - 10} y={y + 4} textAnchor="end" fontSize="10">
                {Math.round(maxValue * p)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const h = (d.value / maxValue) * chartHeight;
          const x = paddingX + i * (barWidth + barGap) + barGap / 2;
          const y = height - paddingY - h;

          return (
            <g key={i}>
              {/* Ghost Bar (Background for scale) */}
              <rect
                x={x}
                y={paddingY}
                width={barWidth}
                height={chartHeight}
                fill="var(--color-neutral-background-weak)"
                rx="4"
              />
              {/* Actual Data Bar */}
              <rect
                className="bar"
                x={x}
                y={y}
                width={barWidth}
                height={h}
                fill={color}
                rx="4"
              >
                <title>{`${d.label}: ${d.value} actions`}</title>
              </rect>
              {/* Value Label */}
              {d.value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize="11"
                  fontWeight="bold"
                  fill={color}
                  style={{ opacity: 0.8 }}
                >
                  {d.value}
                </text>
              )}
              {/* X-axis Label */}
              <text
                x={x + barWidth / 2}
                y={height - paddingY + 20}
                textAnchor="middle"
                fontSize="11"
                className="axis-text"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {/* Base line */}
        <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="var(--color-neutral-content-weak)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
};
