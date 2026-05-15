import React from 'react';

interface LeaderboardEntry {
  username: string;
  count: number;
}

interface LeaderboardProps {
  data: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ data }) => {
  return (
    <div className="leaderboard">
      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#878A8C' }}>Top Moderators (7 Days)</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #EDEFF1', textAlign: 'left' }}>
            <th style={{ padding: '10px 0', color: '#878A8C' }}>Moderator</th>
            <th style={{ padding: '10px 0', textAlign: 'right', color: '#878A8C' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((mod, i) => (
            <tr key={i} style={{ borderBottom: i === data.length - 1 ? 'none' : '1px solid #EDEFF1' }}>
              <td style={{ padding: '10px 0', fontWeight: 'bold' }}>u/{mod.username}</td>
              <td style={{ padding: '10px 0', textAlign: 'right' }}>{mod.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
