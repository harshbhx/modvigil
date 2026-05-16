/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface TimeSavingsProps {
  spikeAlerts: number;
  warningsSent: number;
  digestsSent: number;
  ghostNudges: number;
  installDate: number;
}

const MIN_PER_SPIKE = 150;
const MIN_PER_WARNING = 12;
const MIN_PER_DIGEST = 90;
const MIN_PER_NUDGE = 8;
const HOURLY_RATE_USD = 25;

export const TimeSavings: React.FC<TimeSavingsProps> = ({
  spikeAlerts,
  warningsSent,
  digestsSent,
  ghostNudges,
  installDate,
}) => {
  const minutesSaved =
    spikeAlerts * MIN_PER_SPIKE +
    warningsSent * MIN_PER_WARNING +
    digestsSent * MIN_PER_DIGEST +
    ghostNudges * MIN_PER_NUDGE;

  const hoursSaved = minutesSaved / 60;
  const dollarsSaved = hoursSaved * HOURLY_RATE_USD;

  const daysSinceInstall = Math.max(
    1,
    Math.floor((Date.now() - installDate) / (1000 * 60 * 60 * 24))
  );
  const weeklyHours = (hoursSaved / daysSinceInstall) * 7;

  const rows = [
    { label: 'Spike alerts auto-detected', count: spikeAlerts, minEach: MIN_PER_SPIKE, icon: '🚨' },
    { label: 'User warnings auto-sent', count: warningsSent, minEach: MIN_PER_WARNING, icon: '⚠️' },
    { label: 'Weekly digests generated', count: digestsSent, minEach: MIN_PER_DIGEST, icon: '📰' },
    { label: 'Ghost-mod check-ins', count: ghostNudges, minEach: MIN_PER_NUDGE, icon: '👻' },
  ];

  return (
    <section
      style={{
        backgroundColor: 'var(--color-neutral-background-strong)',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid var(--color-neutral-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>
            ⏱️ Time Saved by ModVigil
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
            Cumulative since install · {daysSinceInstall} day{daysSinceInstall === 1 ? '' : 's'} ago
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '36px', fontWeight: '900', color: 'var(--color-success)', lineHeight: '1' }}>
            {hoursSaved.toFixed(1)}h
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', marginTop: '4px' }}>
            ≈ ${dollarsSaved.toFixed(0)} of mod time · {weeklyHours.toFixed(1)}h / week
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        {rows.map(r => {
          const totalMin = r.count * r.minEach;
          return (
            <div
              key={r.label}
              style={{
                backgroundColor: 'var(--color-neutral-background-weak)',
                borderRadius: '10px',
                padding: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '24px' }}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--color-neutral-content)' }}>
                  {r.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '2px' }}>
                  {r.count} × {r.minEach}m = {formatDuration(totalMin)}
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--color-primary)' }}>
                {r.count}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

function formatDuration(minutes: number): string {
  if (minutes === 0) return '0m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes - h * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
