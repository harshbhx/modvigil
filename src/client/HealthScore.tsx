import React from 'react';

interface HealthScoreProps {
  score: number;
}

export const HealthScore: React.FC<HealthScoreProps> = ({ score }) => {
  const getStatusColor = (s: number) => {
    if (s >= 90) return '#46D160'; // Green
    if (s >= 70) return '#FFD635'; // Yellow
    return '#FF4500'; // Orange/Red
  };

  const color = getStatusColor(score);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div style={{ position: 'relative', width: '60px', height: '60px' }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <circle cx="30" cy="30" r="25" fill="none" stroke="#EDEFF1" strokeWidth="5" />
          <circle 
            cx="30" 
            cy="30" 
            r="25" 
            fill="none" 
            stroke={color} 
            strokeWidth="5" 
            strokeDasharray={`${2 * Math.PI * 25}`}
            strokeDashoffset={`${2 * Math.PI * 25 * (1 - score / 100)}`}
            transform="rotate(-90 30 30)"
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '12px', color: '#878A8C' }}>Community Health</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', color }}>{score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Attention'}</div>
      </div>
    </div>
  );
};
