/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface TrendInsightsProps {
  currentVolume: number;
  previousVolume: number;
  volumeChange: number | null;
  currentApprovalRate: number;
  previousApprovalRate: number;
  approvalChange: number | null;
  currentDaysActive: number;
  previousDaysActive: number;
  healthScore: number;
}

export const TrendInsights: React.FC<TrendInsightsProps> = ({
  currentVolume,
  volumeChange,
  currentApprovalRate,
  approvalChange,
  currentDaysActive,
  previousDaysActive,
  healthScore,
}) => {
  const insight = pickHeadlineInsight({
    volumeChange,
    approvalChange,
    currentVolume,
    currentDaysActive,
    previousDaysActive,
  });

  const tiles: Tile[] = [
    {
      label: 'Action Volume',
      value: `${currentVolume}`,
      change: volumeChange,
      unit: '%',
      hint: 'vs same week 4 weeks ago',
    },
    {
      label: 'Approval Rate',
      value: `${currentApprovalRate.toFixed(0)}%`,
      change: approvalChange,
      unit: 'pp',
      hint: '7-day avg',
      higherIsBetter: true,
    },
    {
      label: 'Days Active (this wk)',
      value: `${currentDaysActive}/7`,
      change: previousDaysActive === 0 ? null : currentDaysActive - previousDaysActive,
      unit: 'days',
      hint: 'vs 4 weeks ago',
      higherIsBetter: true,
    },
    {
      label: 'Health Score',
      value: `${healthScore}/100`,
      change: null,
      unit: '',
      hint: 'coverage + volume',
    },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>
          📈 Trend Analysis
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
          this week vs 4 weeks ago
        </span>
      </div>

      {insight && (
        <div
          style={{
            backgroundColor: 'var(--color-neutral-background-weak)',
            borderLeft: `4px solid ${insight.tone === 'positive' ? 'var(--color-success)' : insight.tone === 'negative' ? 'var(--color-danger)' : 'var(--color-primary)'}`,
            padding: '10px 14px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: 'var(--color-neutral-content)',
            lineHeight: '1.5',
          }}
        >
          <strong style={{ marginRight: '6px' }}>Insight:</strong>{insight.text}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
        }}
      >
        {tiles.map(t => (
          <div
            key={t.label}
            style={{
              backgroundColor: 'var(--color-neutral-background-weak)',
              borderRadius: '10px',
              padding: '14px',
            }}
          >
            <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              {t.label}
            </div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--color-neutral-content)', lineHeight: '1' }}>
              {t.value}
            </div>
            <ChangeBadge change={t.change} unit={t.unit} higherIsBetter={t.higherIsBetter} />
            <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '4px' }}>
              {t.hint}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

interface Tile {
  label: string;
  value: string;
  change: number | null;
  unit: string;
  hint: string;
  higherIsBetter?: boolean;
}

const ChangeBadge: React.FC<{ change: number | null; unit: string; higherIsBetter?: boolean }> = ({ change, unit, higherIsBetter }) => {
  if (change === null) {
    return (
      <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '6px', fontWeight: '600' }}>
        — no prior data
      </div>
    );
  }
  const positive = change > 0;
  const isGood = higherIsBetter ? positive : !positive;
  const color = change === 0 ? 'var(--color-neutral-content-weak)' : isGood ? 'var(--color-success)' : 'var(--color-danger)';
  const arrow = change === 0 ? '·' : positive ? '▲' : '▼';
  const display = unit === '%'
    ? `${Math.abs(change).toFixed(0)}%`
    : unit === 'pp'
      ? `${Math.abs(change).toFixed(1)}pp`
      : `${Math.abs(change).toFixed(0)}${unit ? ` ${unit}` : ''}`;
  return (
    <div style={{ fontSize: '12px', color, marginTop: '6px', fontWeight: '700' }}>
      {arrow} {display}
    </div>
  );
};

function pickHeadlineInsight(p: {
  volumeChange: number | null;
  approvalChange: number | null;
  currentVolume: number;
  currentDaysActive: number;
  previousDaysActive: number;
}): { text: string; tone: 'positive' | 'negative' | 'neutral' } | null {
  if (p.currentVolume === 0) return null;
  if (p.volumeChange !== null && p.volumeChange >= 50) {
    return { text: `Volume is up ${p.volumeChange.toFixed(0)}% vs a month ago — your subreddit is growing or under more pressure.`, tone: 'negative' };
  }
  if (p.volumeChange !== null && p.volumeChange <= -40) {
    return { text: `Volume dropped ${Math.abs(p.volumeChange).toFixed(0)}% — either things calmed down or AutoMod is catching more upstream.`, tone: 'positive' };
  }
  if (p.approvalChange !== null && p.approvalChange <= -10) {
    return { text: `Approval rate fell ${Math.abs(p.approvalChange).toFixed(1)}pp — content quality may be slipping or rules changed.`, tone: 'negative' };
  }
  if (p.approvalChange !== null && p.approvalChange >= 10) {
    return { text: `Approval rate climbed ${p.approvalChange.toFixed(1)}pp — community is producing better content or AutoMod is filtering more upstream.`, tone: 'positive' };
  }
  if (p.previousDaysActive > 0 && p.currentDaysActive < p.previousDaysActive - 1) {
    return { text: `Team is active ${p.currentDaysActive} of 7 days, down from ${p.previousDaysActive} a month ago — coverage is thinning.`, tone: 'negative' };
  }
  return { text: 'Patterns are stable vs last month. No major shifts detected.', tone: 'neutral' };
}
