/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useEffect, useState } from 'react';
import { BarChart } from './Charts.js';
import { Heatmap } from './Heatmap.js';
import { Leaderboard } from './Leaderboard.js';
import { HealthScore } from './HealthScore.js';

interface DashboardData {
  dailyTotals: { label: string; value: number }[];
  heatmapData: number[][];
  leaderboard: { username: string; count: number }[];
  healthScore: number;
  ghostMods: { username: string; lastActiveDays: number }[];
}

/**
 * ModVigil Dashboard — The "Beast Mode" Command Center.
 * Optimized for high-frequency moderation environments.
 */
export const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Request data from the server
    window.parent.postMessage({ type: 'GET_DASHBOARD_DATA' }, '*');

    // 2. Listen for response
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'DASHBOARD_DATA') {
        setData(event.data.payload);
        setLoading(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', backgroundColor: '#DAE0E6' }}>
        <div className="spinner" style={{ width: '50px', height: '50px', border: '5px solid #FF4500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '20px', color: '#1A1A1B', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', fontSize: '12px' }}>Initializing ModVigil Radar...</p>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto', border: '1px solid #EDEFF1' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📡</div>
          <h2 style={{ color: '#FF4500', fontWeight: '900', fontSize: '28px' }}>Radar Offline</h2>
          <p style={{ color: '#878A8C', lineHeight: '1.6', fontSize: '16px' }}>ModVigil is deployed but hasn't detected any moderation signals yet.</p>
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#F6F7F8', borderRadius: '8px', textAlign: 'left', border: '1px solid #EDEFF1' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#1A1A1B' }}>Next Steps:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: '#878A8C', fontSize: '14px' }}>
              <li>Approve or remove any post in this subreddit.</li>
              <li>Wait 15 seconds for the data pipeline to sync.</li>
              <li>Refresh this dashboard.</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: '#1A1A1B', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '20px 30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>🛡️ ModVigil</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#46D16022', padding: '4px 10px', borderRadius: '20px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: '#46D160', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#46D160', textTransform: 'uppercase' }}>Live System</span>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#878A8C', fontWeight: '500' }}>Comprehensive Moderation Intelligence Command Center</p>
        </div>
        <HealthScore score={data.healthScore} />
      </header>

      <main style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Ghost Mods High-Impact Alert */}
        {data.ghostMods.length > 0 && (
          <section style={{ backgroundColor: '#FFFAF0', padding: '20px 25px', borderRadius: '16px', border: '1px solid #FFE4B5', boxShadow: '0 4px 8px rgba(255,165,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '32px' }}>👻</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: '#8B4513', fontSize: '18px', fontWeight: '800' }}>Tactical Team Alert: Ghost Moderators Detected</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#A0522D', lineHeight: '1.4' }}>
                The following team members have been inactive for over 30 days and may need review: 
                <strong style={{ marginLeft: '5px', textDecoration: 'underline' }}>{data.ghostMods.map(m => `u/${m.username}`).join(', ')}</strong>
              </p>
            </div>
            <button style={{ backgroundColor: '#8B4513', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>View Details</button>
          </section>
        )}

        {/* Top Intelligence Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
            <BarChart data={data.dailyTotals} title="7-Day Activity Radar" />
          </section>

          <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
            <Leaderboard data={data.leaderboard} />
          </section>
        </div>

        {/* Full-Width Heatmap */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
          <Heatmap data={data.heatmapData} title="Subreddit Coverage Heatmap (24/7 Matrix)" />
        </section>
      </main>

      <footer style={{ marginTop: '40px', paddingBottom: '30px', textAlign: 'center', color: '#878A8C', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 'bold', color: '#1A1A1B' }}>ModVigil v1.0.0 (Production Ready)</div>
        <div style={{ opacity: 0.6, fontStyle: 'italic' }}>Designed for Reddit Moderators with ❤️ by the ModVigil Team</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
          <span style={{ backgroundColor: '#EDEFF1', padding: '2px 8px', borderRadius: '4px' }}>System Stable</span>
          <span style={{ backgroundColor: '#EDEFF1', padding: '2px 8px', borderRadius: '4px' }}>Last Updated: Just Now</span>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');
      `}</style>
    </div>
  );
};
