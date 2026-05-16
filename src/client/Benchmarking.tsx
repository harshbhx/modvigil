/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';
import type { BenchmarkData } from '../server/redis.js';

interface BenchmarkingProps {
  data: BenchmarkData;
}

const PercentileBar: React.FC<{ label: string; pct: number; color: string }> = ({ label, pct, color }) => (
  <div style={{ marginBottom: '10px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span style={{ fontSize: '12px', color: 'var(--color-neutral-content)' }}>{label}</span>
      <span style={{ fontSize: '12px', fontWeight: 700, color }}>
        Top {Math.max(1, 100 - pct)}%
      </span>
    </div>
    <div style={{ height: '6px', background: 'var(--color-neutral-border)', borderRadius: '3px', overflow: 'hidden' }}>
      <div style={{
        height: '100%',
        width: `${pct}%`,
        background: color,
        borderRadius: '3px',
        transition: 'width 0.6s ease',
      }} />
    </div>
  </div>
);

const Benchmarking: React.FC<BenchmarkingProps> = ({ data }) => {
  const { totalSubreddits, percentiles, message } = data;

  const getColor = (pct: number) => {
    if (pct >= 75) return '#22c55e';
    if (pct >= 50) return '#eab308';
    return '#ef4444';
  };

  return (
    <div style={{
      background: 'var(--color-neutral-background-strong)',
      border: '1px solid var(--color-neutral-border)',
      borderRadius: '12px',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-neutral-content)' }}>
          Benchmarking
        </span>
        <span style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)' }}>
          vs {totalSubreddits} subreddit{totalSubreddits !== 1 ? 's' : ''}
        </span>
      </div>

      {message || !percentiles ? (
        <div style={{
          padding: '16px',
          textAlign: 'center',
          color: 'var(--color-neutral-content-weak)',
          fontSize: '13px',
          background: 'var(--color-neutral-background)',
          borderRadius: '8px',
        }}>
          {message ?? 'Calculating benchmarks...'}
        </div>
      ) : (
        <div>
          <PercentileBar label="Weekly Actions" pct={percentiles.weeklyActions} color={getColor(percentiles.weeklyActions)} />
          <PercentileBar label="Approval Rate" pct={percentiles.approvalRate} color={getColor(percentiles.approvalRate)} />
          <PercentileBar label="Health Score" pct={percentiles.healthScore} color={getColor(percentiles.healthScore)} />
          <PercentileBar label="Team Size" pct={percentiles.teamSize} color={getColor(percentiles.teamSize)} />
          <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '8px', textAlign: 'right' }}>
            Percentile rank among ModVigil subreddits
          </div>
        </div>
      )}
    </div>
  );
};

export default Benchmarking;
