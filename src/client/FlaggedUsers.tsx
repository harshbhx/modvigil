/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

export interface FlaggedUser {
  username: string;
  removals: number;
  timestamp: number;
}

interface FlaggedUsersProps {
  users: FlaggedUser[];
}

export const FlaggedUsers: React.FC<FlaggedUsersProps> = ({ users }) => {
  if (users.length === 0) return null;

  return (
    <section
      style={{
        backgroundColor: 'rgba(234, 0, 39, 0.07)',
        padding: '20px 25px',
        borderRadius: '16px',
        border: '1px solid var(--color-danger)',
        boxShadow: '0 4px 8px rgba(234, 0, 39, 0.1)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
        <div style={{ fontSize: '32px' }}>🚩</div>
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: 0, color: 'var(--color-neutral-content)', fontSize: '18px', fontWeight: '800' }}>
            Suspicious Users — Review Recommended
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.4' }}>
            {users.length} user{users.length === 1 ? '' : 's'} hit 4+ removals in the last 30 days. ModVigil flagged them for manual review — no auto-ban.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map(u => {
          const days = Math.floor((Date.now() - u.timestamp) / (1000 * 60 * 60 * 24));
          const ago = days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`;
          return (
            <div
              key={u.username}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                backgroundColor: 'var(--color-neutral-background-strong)',
                borderRadius: '8px',
                padding: '10px 14px',
                border: '1px solid var(--color-neutral-border)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--color-neutral-content)', flex: 1 }}>
                u/{u.username}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  fontWeight: '900',
                  color: 'var(--color-danger)',
                  backgroundColor: 'rgba(234, 0, 39, 0.1)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                {u.removals} removals
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', whiteSpace: 'nowrap' }}>
                flagged {ago}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
