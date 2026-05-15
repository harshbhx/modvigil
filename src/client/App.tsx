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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif' }}>
        <p>Loading ModVigil Dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <h2>No data available yet.</h2>
        <p>ModVigil starts collecting data after the first moderator action happens in this subreddit.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#1A1A1B', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
      <header style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '15px 20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>🛡️ ModVigil Dashboard</h1>
        <HealthScore score={data.healthScore} />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
        {/* Main Charts */}
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <BarChart data={data.dailyTotals} title="Actions (Last 7 Days)" />
        </section>

        {/* Heatmap */}
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Heatmap data={data.heatmapData} title="Moderation Heatmap (7x24)" />
        </section>

        {/* Leaderboard */}
        <section style={{ backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
          <Leaderboard data={data.leaderboard} />
        </section>
      </div>

      <footer style={{ marginTop: '30px', textAlign: 'center', color: '#878A8C', fontSize: '12px' }}>
        ModVigil v0.0.1 • Reddit Mod Tools Hackathon 2026
      </footer>
    </div>
  );
};
