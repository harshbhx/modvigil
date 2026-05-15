/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useEffect, useState } from 'react';
import { BarChart } from './Charts.js';
import { Heatmap } from './Heatmap.js';
import { Leaderboard } from './Leaderboard.js';
import { HealthScore } from './HealthScore.js';
import { QuickStats } from './QuickStats.js';
import { HelpModal } from './HelpModal.js';
import { SettingsModal } from './SettingsModal.js';

interface DashboardData {
  dailyTotals: { label: string; value: number }[];
  heatmapData: number[][];
  leaderboard: { username: string; count: number }[];
  healthScore: number;
  ghostMods: { username: string; lastActiveDays: number }[];
  totalActionsToday: number;
  approvalRate: number;
  topRemovalReason: string | null;
}

/**
 * ModVigil Dashboard — The "Beast Mode" Command Center.
 * Optimized for high-frequency moderation environments.
 */
export const App: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // 1. Request data from the server
    window.parent.postMessage({ type: 'GET_DASHBOARD_DATA' }, '*');

    // 2. Listen for response
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DASHBOARD_DATA') {
        setData(event.data.payload);
        setLoading(false);
      }
      if (event.data?.type === 'ERROR') {
        setError(event.data.payload?.message || 'Failed to load dashboard');
        setLoading(false);
      }
      if (event.data?.type === 'NUDGE_SUCCESS') {
        alert(`✅ Successfully nudged ${event.data.payload.count} inactive moderator(s)`);
      }
    };

    // 3. Set timeout for request
    const timeout = setTimeout(() => {
      setError('Dashboard request timed out. Please refresh.');
      setLoading(false);
    }, 10000); // 10 second timeout

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimeout(timeout);
    };
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

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#DAE0E6', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto', border: '1px solid #EDEFF1' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: '#FF4500', fontWeight: '900', fontSize: '28px' }}>Error Loading Dashboard</h2>
          <p style={{ color: '#878A8C', lineHeight: '1.6', fontSize: '16px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: '#FF4500', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Refresh Dashboard
          </button>
        </div>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              backgroundColor: '#F6F7F8',
              border: '1px solid #EDEFF1',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1A1A1B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '16px' }}>⚙️</span>
            Settings
          </button>
          <button
            onClick={() => setShowHelp(true)}
            style={{
              backgroundColor: '#F6F7F8',
              border: '1px solid #EDEFF1',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: '#1A1A1B',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '16px' }}>❓</span>
            Help
          </button>
          <HealthScore score={data.healthScore} />
        </div>
      </header>

      {/* Quick Stats */}
      <QuickStats
        totalActionsToday={data.totalActionsToday}
        approvalRate={data.approvalRate}
        topRemovalReason={data.topRemovalReason}
      />

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
            <button
              onClick={() => {
                window.parent.postMessage({
                  type: 'NUDGE_GHOST_MODS',
                  payload: { ghostMods: data.ghostMods }
                }, '*');
              }}
              style={{ backgroundColor: '#8B4513', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Nudge Inactive Mods
            </button>
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

      {/* Help Modal */}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          currentSettings={{
            spikeThreshold: 3.0,
            transparencyMode: false,
            enableWarnings: true,
          }}
        />
      )}

      <style>{`
        @keyframes pulse {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&display=swap');

        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          body {
            font-size: 14px;
          }

          /* Stack grid layouts vertically */
          [style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }

          /* Reduce padding on mobile */
          header {
            padding: 16px !important;
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px;
          }

          h1 {
            font-size: 22px !important;
          }

          section {
            padding: 16px !important;
          }

          /* Make charts responsive */
          svg {
            max-width: 100%;
            height: auto;
          }
        }

        @media (max-width: 480px) {
          /* Extra small screens */
          h1 {
            font-size: 18px !important;
          }

          [style*="padding: 24px"] {
            padding: 12px !important;
          }
        }
      `}</style>
    </div>
  );
};
