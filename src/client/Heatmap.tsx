/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface HeatmapProps {
  data: number[][]; // 7 rows (days), 24 columns (hours). Row 0 = today, row 6 = 6 days ago.
  title: string;
}

/**
 * FIX #2: Day labels now reflect actual UTC weekdays instead of always showing Mon-Sun.
 *         Data rows are reversed so the chart reads oldest→newest (left to right).
 */
export const Heatmap: React.FC<HeatmapProps> = ({ data, title }) => {
  const cellSize = 18;
  const paddingLeft = 50;
  const paddingTop = 40;
  const paddingBottom = 40;
  const width = paddingLeft + 24 * cellSize + 30;
  const height = paddingTop + 7 * cellSize + paddingBottom;

  // FIX #2: Compute correct day labels based on today's UTC weekday
  const ALL_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayUTC = new Date().getUTCDay(); // 0=Sun..6=Sat
  // Build labels for [6 days ago … today] so chart reads chronologically
  const orderedDays: string[] = [];
  for (let i = 6; i >= 0; i--) {
    orderedDays.push(ALL_DAYS[(todayUTC - i + 7) % 7]);
  }
  // Reverse data so row 0 = 6 days ago (matches orderedDays[0])
  const orderedData = [...data].reverse();

  let maxValue = 0;
  orderedData.forEach(row => row.forEach(val => { if (val > maxValue) maxValue = val; }));
  if (maxValue === 0) maxValue = 1;

  const getColor = (value: number) => {
    if (value === 0) return 'var(--color-neutral-background-weak)';
    const intensity = Math.min(value / maxValue, 1);
    return `rgba(255, 69, 0, ${0.15 + intensity * 0.85})`;
  };

  return (
    <div className="heatmap-container" style={{ width: '100%', overflowX: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</h3>
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)' }}>UTC Timescale</div>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ maxWidth: '100%', height: 'auto', minWidth: '320px', background: 'var(--color-neutral-background-strong)', borderRadius: '12px' }}>
        <style>{`
          .cell { transition: transform 0.2s, stroke 0.2s; cursor: pointer; }
          .cell:hover { transform: scale(1.1); transform-origin: center; stroke: var(--color-neutral-content); stroke-width: 1px; }
        `}</style>

        {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
          <text key={h} x={paddingLeft + h * cellSize + cellSize / 2} y={paddingTop - 15} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--color-neutral-content-weak)">
            {h}h
          </text>
        ))}

        {orderedData.map((row, dayIndex) => (
          <g key={dayIndex}>
            <text x={paddingLeft - 15} y={paddingTop + dayIndex * cellSize + cellSize / 1.5} textAnchor="end" fontSize="10" fontWeight="bold" fill="var(--color-neutral-content)">
              {orderedDays[dayIndex]}
            </text>
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
                <title>{`${orderedDays[dayIndex]} ${hourIndex}:00 UTC — ${value} actions`}</title>
              </rect>
            ))}
          </g>
        ))}

        <g transform={`translate(${paddingLeft}, ${height - 25})`}>
          <text x="-10" y="10" fontSize="10" fontWeight="bold" fill="var(--color-neutral-content-weak)" textAnchor="end">Quiet</text>
          {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
            <rect key={i} x={i * 25} y={0} width={22} height={12} fill={getColor(maxValue * p)} rx="2" />
          ))}
          <text x={5 * 25 + 5} y={10} fontSize="10" fontWeight="bold" fill="var(--color-neutral-content-weak)">Active</text>
        </g>
      </svg>
    </div>
  );
};
