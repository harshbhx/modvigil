/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

export interface ModInsight {
  username: string;
  total: number;
  approvalRate: number;
  posts: number;
  comments: number;
  daysActive: number;
}

interface ModInsightsProps {
  mods: ModInsight[];
  teamApprovalRate: number;
}

export const ModInsights: React.FC<ModInsightsProps> = ({ mods, teamApprovalRate }) => {
  if (mods.length === 0) {
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
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>
          🧑‍⚖️ Moderator Performance
        </h3>
        <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-content-weak)' }}>
          No moderator activity yet. Insights appear once mods take a few actions.
        </p>
      </section>
    );
  }

  const maxTotal = Math.max(...mods.map(m => m.total), 1);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>
          🧑‍⚖️ Moderator Performance
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
          last 7 days · team approval {teamApprovalRate.toFixed(0)}%
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {mods.map((m, i) => {
          const specialization = describeSpecialization(m);
          const widthPct = (m.total / maxTotal) * 100;
          const approvalDelta = m.approvalRate - teamApprovalRate;
          const approvalColor =
            Math.abs(approvalDelta) < 5
              ? 'var(--color-neutral-content-weak)'
              : approvalDelta >= 0
                ? 'var(--color-success)'
                : 'var(--color-warning)';

          return (
            <div
              key={m.username}
              style={{
                backgroundColor: 'var(--color-neutral-background-weak)',
                borderRadius: '10px',
                padding: '12px 14px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: i === 0 ? 'var(--color-warning)' : 'var(--color-neutral-background-strong)',
                      color: i === 0 ? '#1A1A1B' : 'var(--color-neutral-content)',
                      fontSize: '11px',
                      fontWeight: '900',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-neutral-content)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    u/{m.username}
                  </span>
                </div>
                <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                  {m.total} actions
                </div>
              </div>

              <div
                style={{
                  height: '4px',
                  backgroundColor: 'var(--color-neutral-border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                  marginBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: '100%',
                    backgroundColor: 'var(--color-primary)',
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', color: 'var(--color-neutral-content-weak)' }}>
                <span>
                  Approval: <strong style={{ color: approvalColor }}>{m.approvalRate.toFixed(0)}%</strong>
                  {Math.abs(approvalDelta) >= 5 && (
                    <span style={{ color: approvalColor }}> ({approvalDelta > 0 ? '+' : ''}{approvalDelta.toFixed(0)}pp)</span>
                  )}
                </span>
                <span>Active: <strong style={{ color: 'var(--color-neutral-content)' }}>{m.daysActive}/7 days</strong></span>
                <span>{specialization}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

function describeSpecialization(m: ModInsight): string {
  const total = m.posts + m.comments;
  if (total === 0) return 'No content actions';
  const postShare = (m.posts / total) * 100;
  if (postShare >= 70) return `Posts specialist (${postShare.toFixed(0)}%)`;
  if (postShare <= 30) return `Comments specialist (${(100 - postShare).toFixed(0)}%)`;
  return 'Balanced (posts & comments)';
}
