/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface HealthScoreProps {
  score: number;
}

export const HealthScore: React.FC<HealthScoreProps> = ({ score }) => {
  const getStatusColor = (s: number) => {
    if (s >= 90) return 'var(--color-success)'; // Green
    if (s >= 70) return 'var(--color-warning)'; // Yellow
    return 'var(--color-primary)'; // Orange/Red
  };

  const color = getStatusColor(score);
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', backgroundColor: 'var(--color-neutral-background-weak)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--color-neutral-border)' }}>
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
          <circle cx="30" cy="30" r={radius} fill="none" stroke="var(--color-neutral-border)" strokeWidth="6" />
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
        <div style={{ position: 'absolute', top: 0, left: 0, width: '60px', height: '60px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '16px', fontWeight: '800', color: 'var(--color-neutral-content)' }}>
          {score}
        </div>
      </div>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Subreddit Health</div>
        <div style={{ fontSize: '18px', fontWeight: '900', color }}>{score >= 85 ? 'ELITE' : score >= 70 ? 'STABLE' : 'CRITICAL'}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: score >= 70 ? 'var(--color-success)' : 'var(--color-primary)' }}>{score >= 70 ? '▲' : '▼'}</span> 
          {score >= 70 ? 'Improving coverage' : 'Coverage gaps detected'}
        </div>
      </div>
    </div>
  );
};
