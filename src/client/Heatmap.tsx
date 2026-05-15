import React from 'react';

interface HeatmapProps {
  data: number[][]; // 7 rows (days), 24 columns (hours)
  title: string;
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * A pure SVG heatmap for ModVigil.
 * Rows = Days, Columns = Hours.
 */
export const Heatmap: React.FC<HeatmapProps> = ({ data, title }) => {
  const cellSize = 15;
  const paddingLeft = 40;
  const paddingTop = 30;
  const width = paddingLeft + 24 * cellSize + 20;
  const height = paddingTop + 7 * cellSize + 20;

  // Find max value for color scaling
  let maxValue = 1;
  data.forEach(row => row.forEach(val => {
    if (val > maxValue) maxValue = val;
  }));

  const getColor = (value: number) => {
    if (value === 0) return '#F6F7F8';
    const intensity = Math.min(value / maxValue, 1);
    // Scale from light orange to deep red-orange (Reddit brand colors)
    return `rgba(255, 69, 0, ${0.1 + intensity * 0.9})`;
  };

  return (
    <div className="heatmap-container" style={{ marginBottom: '20px', overflowX: 'auto' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '16px', color: '#878A8C' }}>{title}</h3>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ background: '#FFFFFF', borderRadius: '8px', border: '1px solid #EDEFF1' }}>
        {/* Hour labels */}
        {[0, 6, 12, 18, 23].map(h => (
          <text key={h} x={paddingLeft + h * cellSize + cellSize / 2} y={paddingTop - 10} textAnchor="middle" fontSize="9" fill="#878A8C">
            {h}h
          </text>
        ))}

        {/* Day rows */}
        {data.map((row, dayIndex) => (
          <g key={dayIndex}>
            {/* Day label */}
            <text x={paddingLeft - 10} y={paddingTop + dayIndex * cellSize + cellSize / 1.5} textAnchor="end" fontSize="9" fill="#878A8C">
              {DAYS[dayIndex]}
            </text>
            
            {/* Cells */}
            {row.map((value, hourIndex) => (
              <rect
                key={hourIndex}
                x={paddingLeft + hourIndex * cellSize}
                y={paddingTop + dayIndex * cellSize}
                width={cellSize - 1}
                height={cellSize - 1}
                fill={getColor(value)}
                rx="1"
              >
                <title>{`${DAYS[dayIndex]} ${hourIndex}:00 - ${value} actions`}</title>
              </rect>
            ))}
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${paddingLeft}, ${height - 15})`}>
          <text x="-5" y="10" fontSize="8" fill="#878A8C" textAnchor="end">Low</text>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <rect
              key={i}
              x={i * 20}
              y={0}
              width={18}
              height={10}
              fill={getColor(maxValue * p)}
              rx="1"
            />
          ))}
          <text x={5 * 20} y={10} fontSize="8" fill="#878A8C">High</text>
        </g>
      </svg>
    </div>
  );
};
