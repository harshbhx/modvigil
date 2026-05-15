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
        <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #FF4500', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '15px', color: '#878A8C' }}>Loading ModVigil Dashboard...</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', maxWidth: '500px', margin: '0 auto' }}>
          <h2 style={{ color: '#FF4500' }}>No data available yet.</h2>
          <p style={{ color: '#878A8C', lineHeight: '1.5' }}>ModVigil starts collecting data after the first moderator action happens in this subreddit.</p>
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#F6F7F8', borderRadius: '4px', fontSize: '14px', color: '#1A1A1B' }}>
            <strong>Tip:</strong> Try approving or removing a post to see the dashboard come to life!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#1A1A1B', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '28px' }}>🛡️</span> ModVigil Dashboard
          </h1>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#878A8C' }}>Real-time Moderation Intelligence</p>
        </div>
        <HealthScore score={data.healthScore} />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Ghost Mods Warning */}
        {data.ghostMods.length > 0 && (
          <section style={{ backgroundColor: '#FFFAF0', padding: '15px 20px', borderRadius: '8px', border: '1px solid #FFE4B5', display: 'flex', alignItems: 'center', gap: '15px' }}>
            <span style={{ fontSize: '24px' }}>👻</span>
            <div>
              <h4 style={{ margin: 0, color: '#8B4513' }}>Ghost Moderator Alert</h4>
              <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#A0522D' }}>
                {data.ghostMods.length} moderator{data.ghostMods.length > 1 ? 's have' : ' has'} been inactive for over 30 days: 
                <strong> {data.ghostMods.map(m => `u/${m.username}`).join(', ')}</strong>
              </p>
            </div>
          </section>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {/* Main Charts */}
          <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <BarChart data={data.dailyTotals} title="Total Actions (Last 7 Days)" />
          </section>

          {/* Leaderboard */}
          <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <Leaderboard data={data.leaderboard} />
          </section>
        </div>

        {/* Heatmap */}
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Heatmap data={data.heatmapData} title="Moderation Heatmap (7-Day Coverage)" />
        </section>
      </div>

      <footer style={{ marginTop: '30px', paddingBottom: '20px', textAlign: 'center', color: '#878A8C', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <div>ModVigil v0.0.1 • Reddit Mod Tools Hackathon 2026</div>
        <div style={{ opacity: 0.6 }}>"The radar your community needs."</div>
      </footer>
    </div>
  );
};
