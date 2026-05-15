/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface LeaderboardEntry {
  username: string;
  count: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

/**
 * A "Beast Mode" moderator leaderboard.
 * Includes relative activity bars and high-contrast styling.
 */
export const Leaderboard: React.FC<LeaderboardProps> = ({ data }) => {
  const maxActions = data.length > 0 ? Math.max(...data.map(m => m.count)) : 1;

  return (
    <div className="leaderboard">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '1px' }}>Top Moderators (7 Days)</h3>
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)' }}>Verified Actions</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {data.map((mod, i) => {
          const percentage = (mod.count / maxActions) * 100;
          return (
            <div key={i} style={{ backgroundColor: 'var(--color-neutral-background-weak)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--color-neutral-border)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '24px', height: '24px', backgroundColor: 'var(--color-primary)', color: 'white', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                    {i + 1}
                  </div>
                  <span style={{ fontWeight: 'bold', color: 'var(--color-neutral-content)' }}>u/{mod.username}</span>
                  {i === 0 && <span style={{ backgroundColor: 'var(--color-warning)', color: 'var(--color-neutral-content)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>MVP</span>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>{mod.count}</div>
                  <div style={{ fontSize: '9px', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase' }}>Actions</div>
                </div>
              </div>
              {/* Relative Activity Bar */}
              <div style={{ height: '4px', backgroundColor: 'var(--color-neutral-border)', borderRadius: '2px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    backgroundColor: i === 0 ? 'var(--color-primary)' : 'var(--color-primary-hover)', 
                    borderRadius: '2px',
                    transition: 'width 1s ease-in-out'
                  }} 
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
