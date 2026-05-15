/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface HeatmapProps {
  data: number[][]; // 7 rows (days), 24 columns (hours)
  title: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A "Beast Mode" SVG heatmap for ModVigil.
 * Optimized for rapid data pattern recognition.
 */
export const Heatmap: React.FC<HeatmapProps> = ({ data, title }) => {
  const cellSize = 18;
  const paddingLeft = 50;
  const paddingTop = 40;
  const paddingBottom = 40;
  const width = paddingLeft + 24 * cellSize + 30;
  const height = paddingTop + 7 * cellSize + paddingBottom;

  // Find max value for color scaling
  let maxValue = 0;
  data.forEach(row => row.forEach(val => {
    if (val > maxValue) maxValue = val;
  }));
  if (maxValue === 0) maxValue = 1;

  const getColor = (value: number) => {
    if (value === 0) return '#F6F7F8';
    const intensity = Math.min(value / maxValue, 1);
    // Reddit Brand: Darker Red-Orange gradient
    return `rgba(255, 69, 0, ${0.15 + intensity * 0.85})`;
  };

  return (
    <div className="heatmap-container" style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#878A8C', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
        <div style={{ fontSize: '11px', color: '#878A8C' }}>UTC Timescale</div>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', height: 'auto', minWidth: '320px', background: '#FFFFFF', borderRadius: '12px' }}>
        <style>{`
          .cell { transition: transform 0.2s, stroke 0.2s; cursor: pointer; }
          .cell:hover { transform: scale(1.1); transform-origin: center; stroke: #1A1A1B; stroke-width: 1px; z-index: 10; }
        `}</style>

        {/* Hour labels */}
        {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
          <text key={h} x={paddingLeft + h * cellSize + cellSize / 2} y={paddingTop - 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#878A8C">
            {h}h
          </text>
        ))}

        {/* Day rows */}
        {data.map((row, dayIndex) => (
          <g key={dayIndex}>
            {/* Day label */}
            <text x={paddingLeft - 15} y={paddingTop + dayIndex * cellSize + cellSize / 1.5} textAnchor="end" fontSize="10" fontWeight="bold" fill="#1A1A1B">
              {DAYS[dayIndex]}
            </text>
            
            {/* Cells */}
            {row.map((value, hourIndex) => (
              <rect
                key={hourIndex}
                className="cell"
                x={paddingLeft + hourIndex * cellSize}
                y={paddingTop + dayIndex * cellSize}
                width={cellSize - 2}
                height={cellSize - 2}
                fill={getColor(value)}
                rx="3"
              >
                <title>{`${DAYS[dayIndex]} ${hourIndex}:00 - ${value} actions`}</title>
              </rect>
            ))}
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${paddingLeft}, ${height - 25})`}>
          <text x="-10" y="10" fontSize="10" fontWeight="bold" fill="#878A8C" textAnchor="end">Quiet</text>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <rect
              key={i}
              x={i * 25}
              y={0}
              width={22}
              height={12}
              fill={getColor(maxValue * p)}
              rx="2"
            />
          ))}
          <text x={5 * 25 + 5} y={10} fontSize="10" fontWeight="bold" fill="#878A8C">Active</text>
        </g>
      </svg>
    </div>
  );
};
