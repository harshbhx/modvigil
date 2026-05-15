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
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: '#F6F7F8', padding: '10px 15px', borderRadius: '12px', border: '1px solid #EDEFF1' }}>
      <div style={{ position: 'relative', width: '60px', height: '60px' }}>
        <svg width="60" height="60" viewBox="0 0 60 60">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="30" cy="30" r={radius} fill="none" stroke="#EDEFF1" strokeWidth="6" />
          <circle 
            cx="30" 
            cy="30" 
            r={radius} 
            fill="none" 
            stroke="url(#scoreGradient)" 
            strokeWidth="6" 
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 30 30)"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out', filter: 'url(#glow)' }}
          />
        </svg>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: '800', color: '#1A1A1B' }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#878A8C', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subreddit Health</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color }}>{score >= 85 ? 'ELITE' : score >= 70 ? 'STABLE' : 'CRITICAL'}</div>
        <div style={{ fontSize: '11px', color: '#878A8C', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: score >= 70 ? '#46D160' : '#FF4500' }}>{score >= 70 ? '▲' : '▼'}</span> 
          {score >= 70 ? 'Improving coverage' : 'Coverage gaps detected'}
        </div>
      </div>
    </div>
  );
};
