/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

export interface RaidRiskData {
  score: number;
  level: 'NORMAL' | 'ELEVATED' | 'HIGH RISK' | 'RAID LIKELY';
  signals: string[];
  recommendation: string;
  last15min: number;
  last30min: number;
}

interface RaidPredictionProps {
  data: RaidRiskData;
}

export const RaidPrediction: React.FC<RaidPredictionProps> = ({ data }) => {
  const { score, level, signals, recommendation, last15min } = data;

  const getColor = () => {
    if (score >= 80) return '#ef4444';   // red
    if (score >= 60) return '#f97316';   // orange
    if (score >= 30) return '#eab308';   // yellow
    return '#22c55e';                     // green
  };

  const getBgColor = () => {
    if (score >= 80) return 'rgba(239,68,68,0.1)';
    if (score >= 60) return 'rgba(249,115,22,0.1)';
    if (score >= 30) return 'rgba(234,179,8,0.1)';
    return 'rgba(34,197,94,0.08)';
  };

  const color = getColor();
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;

  return (
    <div style={{
      background: 'var(--color-neutral-background-strong)',
      border: `1px solid var(--color-neutral-border)`,
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-neutral-content)' }}>
          🎯 Raid Prediction
        </span>
        {score >= 60 && (
          <span style={{
            fontSize: '11px',
            fontWeight: 700,
            color,
            background: getBgColor(),
            border: `1px solid ${color}`,
            borderRadius: '4px',
            padding: '2px 6px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}>
            ⚠ ALERT
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Gauge */}
        <div style={{ flexShrink: 0, textAlign: 'center' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <defs>
              <filter id="raid-glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="var(--color-neutral-border)"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={progress}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              filter={score >= 60 ? 'url(#raid-glow)' : undefined}
              style={{ transition: 'stroke-dashoffset 0.6s ease' }}
            />
            <text x="50" y="46" textAnchor="middle" fill={color} fontSize="18" fontWeight="bold">{score}</text>
            <text x="50" y="60" textAnchor="middle" fill="var(--color-neutral-content-weak)" fontSize="9">/100</text>
          </svg>
          <div style={{ fontSize: '11px', fontWeight: 700, color, marginTop: '4px', letterSpacing: '0.5px' }}>
            {level}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--color-neutral-content-weak)', marginTop: '4px' }}>
            {last15min} actions / 15m
          </div>
        </div>

        {/* Signals + recommendation */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--color-neutral-content-weak)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}>
            Signals
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
            {signals.map((s, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: 'var(--color-neutral-content)',
              }}>
                <span style={{ color, flexShrink: 0 }}>▸</span>
                {s}
              </div>
            ))}
          </div>
          <div style={{
            fontSize: '12px',
            color: score >= 30 ? color : 'var(--color-neutral-content-weak)',
            background: getBgColor(),
            borderRadius: '6px',
            padding: '8px 10px',
            borderLeft: `3px solid ${color}`,
          }}>
            {recommendation}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RaidPrediction;
