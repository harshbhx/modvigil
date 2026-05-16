/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

export type Priority = 'URGENT' | 'IMPORTANT' | 'SUGGESTED';

export interface Recommendation {
  priority: Priority;
  icon: string;
  title: string;
  detail: string;
  metric?: string;
}

interface ActionItemsProps {
  recommendations: Recommendation[];
}

const STYLES: Record<Priority, { border: string; bg: string; pillBg: string; pillFg: string; label: string }> = {
  URGENT:    { border: 'var(--color-danger)',  bg: 'rgba(234, 0, 39, 0.06)',   pillBg: 'var(--color-danger)',  pillFg: '#fff', label: 'URGENT' },
  IMPORTANT: { border: 'var(--color-warning)', bg: 'rgba(255, 176, 0, 0.08)',  pillBg: 'var(--color-warning)', pillFg: '#1A1A1B', label: 'IMPORTANT' },
  SUGGESTED: { border: 'var(--color-neutral-border)', bg: 'var(--color-neutral-background-weak)', pillBg: 'var(--color-neutral-background-strong)', pillFg: 'var(--color-neutral-content-weak)', label: 'SUGGESTED' },
};

export const ActionItems: React.FC<ActionItemsProps> = ({ recommendations }) => {
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
          🎯 Action Items
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
          {recommendations.length} recommendation{recommendations.length === 1 ? '' : 's'}
        </span>
      </div>

      {recommendations.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-neutral-content-weak)', fontSize: '14px' }}>
          ✨ Nothing to action — your subreddit is in great shape.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {recommendations.map((r, i) => {
            const s = STYLES[r.priority];
            return (
              <div
                key={i}
                style={{
                  backgroundColor: s.bg,
                  border: `1px solid ${s.border}`,
                  borderLeft: `4px solid ${s.border}`,
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '14px',
                }}
              >
                <div style={{ fontSize: '24px', lineHeight: '1', flexShrink: 0 }}>{r.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: '900',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: s.pillBg,
                        color: s.pillFg,
                        letterSpacing: '0.5px',
                      }}
                    >
                      {s.label}
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-neutral-content)' }}>
                      {r.title}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.5' }}>
                    {r.detail}
                  </div>
                </div>
                {r.metric && (
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '900',
                      color: s.border,
                      whiteSpace: 'nowrap',
                      alignSelf: 'center',
                    }}
                  >
                    {r.metric}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
