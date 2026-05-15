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
    let attempts = 0;
    let dataReceived = false;
    const retryTimeouts: NodeJS.Timeout[] = [];

    // Retry logic with exponential backoff: 0s, 1s, 2s, 3s
    const requestData = () => {
      if (dataReceived) return;

      attempts++;
      console.log(`[ModVigil] Dashboard data request attempt ${attempts}/4`);
      window.parent.postMessage({ type: 'GET_DASHBOARD_DATA' }, '*');

      if (attempts < 4) {
        // Schedule next retry: 1s, 2s, 3s
        const delay = attempts * 1000;
        const retryTimeout = setTimeout(requestData, delay);
        retryTimeouts.push(retryTimeout);
      }
    };

    // Listen for response
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DASHBOARD_DATA') {
        dataReceived = true;
        setData(event.data.payload);
        setLoading(false);
        // Clear any pending retries
        retryTimeouts.forEach(t => clearTimeout(t));
      }
      if (event.data?.type === 'ERROR') {
        dataReceived = true;
        setError(event.data.payload?.message || 'Failed to load dashboard');
        setLoading(false);
        retryTimeouts.forEach(t => clearTimeout(t));
      }
      if (event.data?.type === 'NUDGE_SUCCESS') {
        alert(`✅ Successfully nudged ${event.data.payload.count} inactive moderator(s)`);
      }
      if (event.data?.type === 'DEMO_DATA_SUCCESS') {
        alert('✅ Demo data loaded! Refreshing dashboard...');
        window.location.reload();
      }
    };

    // Hard timeout after all retries (10 seconds total)
    const hardTimeout = setTimeout(() => {
      if (!dataReceived) {
        setError('Dashboard request timed out after 4 attempts. Please refresh.');
        setLoading(false);
      }
    }, 10000);

    // Start first request immediately
    requestData();

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      retryTimeouts.forEach(t => clearTimeout(t));
      clearTimeout(hardTimeout);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', backgroundColor: 'var(--color-neutral-background)', minHeight: '100vh' }}>
        {/* Header Skeleton */}
        <div style={{ marginBottom: '24px', backgroundColor: 'var(--color-neutral-background-strong)', padding: '20px 30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ width: '200px', height: '28px', backgroundColor: '#E5E7EB', borderRadius: '8px', marginBottom: '8px' }}></div>
              <div className="skeleton" style={{ width: '300px', height: '13px', backgroundColor: '#E5E7EB', borderRadius: '6px' }}></div>
            </div>
            <div className="skeleton" style={{ width: '120px', height: '120px', backgroundColor: '#E5E7EB', borderRadius: '50%' }}></div>
          </div>
        </div>

        {/* Quick Stats Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
              <div className="skeleton" style={{ width: '60%', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '6px', marginBottom: '12px' }}></div>
              <div className="skeleton" style={{ width: '80px', height: '32px', backgroundColor: '#E5E7EB', borderRadius: '8px' }}></div>
            </div>
          ))}
        </div>

        {/* Charts Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px', marginBottom: '24px' }}>
          <div style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
            <div className="skeleton" style={{ width: '150px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '6px', marginBottom: '20px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '200px', backgroundColor: '#E5E7EB', borderRadius: '8px' }}></div>
          </div>
          <div style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
            <div className="skeleton" style={{ width: '150px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '6px', marginBottom: '20px' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '200px', backgroundColor: '#E5E7EB', borderRadius: '8px' }}></div>
          </div>
        </div>

        {/* Heatmap Skeleton */}
        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
          <div className="skeleton" style={{ width: '200px', height: '20px', backgroundColor: '#E5E7EB', borderRadius: '6px', marginBottom: '20px' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '300px', backgroundColor: '#E5E7EB', borderRadius: '8px' }}></div>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          .skeleton {
            animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: 'var(--color-neutral-background)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--color-neutral-border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <h2 style={{ color: 'var(--color-primary)', fontWeight: '900', fontSize: '28px' }}>Error Loading Dashboard</h2>
          <p style={{ color: 'var(--color-neutral-content-weak)', lineHeight: '1.6', fontSize: '16px' }}>{error}</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '20px', padding: '12px 24px', backgroundColor: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Refresh Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: 'var(--color-neutral-background)', minHeight: '100vh' }}>
        <div style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '40px', borderRadius: '16px', boxShadow: '0 8px 16px rgba(0,0,0,0.1)', maxWidth: '600px', margin: '0 auto', border: '1px solid var(--color-neutral-border)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📡</div>
          <h2 style={{ color: 'var(--color-primary)', fontWeight: '900', fontSize: '28px' }}>Radar Offline</h2>
          <p style={{ color: 'var(--color-neutral-content-weak)', lineHeight: '1.6', fontSize: '16px' }}>ModVigil is deployed but hasn't detected any moderation signals yet.</p>
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: 'var(--color-neutral-background-weak)', borderRadius: '8px', textAlign: 'left', border: '1px solid var(--color-neutral-border)' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--color-neutral-content)' }}>Next Steps:</h4>
            <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--color-neutral-content-weak)', fontSize: '14px' }}>
              <li>Approve or remove any post in this subreddit.</li>
              <li>Wait 15 seconds for the data pipeline to sync.</li>
              <li>Refresh this dashboard.</li>
            </ul>
          </div>
          <button
            onClick={() => {
              window.parent.postMessage({ type: 'POPULATE_DEMO_DATA' }, '*');
            }}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: 'var(--color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255, 69, 0, 0.3)',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            🎬 Load Demo Data (For Testing)
          </button>
          <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--color-neutral-content-weak)', fontStyle: 'italic' }}>
            Generates 7 days of realistic moderation data for judges/testing
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, sans-serif', color: 'var(--color-neutral-content)', backgroundColor: 'var(--color-neutral-background)', minHeight: '100vh' }}>
      <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-neutral-background-strong)', padding: '20px 30px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '900', letterSpacing: '-0.5px' }}>🛡️ ModVigil</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(70, 209, 96, 0.13)', padding: '4px 10px', borderRadius: '20px' }}>
              <div style={{ width: '8px', height: '8px', backgroundColor: 'var(--color-success)', borderRadius: '50%', animation: 'pulse 2s infinite' }}></div>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--color-success)', textTransform: 'uppercase' }}>Live System</span>
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-neutral-content-weak)', fontWeight: '500' }}>Comprehensive Moderation Intelligence Command Center</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              backgroundColor: 'var(--color-neutral-background-weak)',
              border: '1px solid var(--color-neutral-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--color-neutral-content)',
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
              backgroundColor: 'var(--color-neutral-background-weak)',
              border: '1px solid var(--color-neutral-border)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--color-neutral-content)',
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
          <section style={{ backgroundColor: 'rgba(255, 176, 0, 0.1)', padding: '20px 25px', borderRadius: '16px', border: '1px solid var(--color-warning)', boxShadow: '0 4px 8px rgba(255,176,0,0.1)', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ fontSize: '32px' }}>👻</div>
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: 0, color: 'var(--color-neutral-content)', fontSize: '18px', fontWeight: '800' }}>Tactical Team Alert: Ghost Moderators Detected</h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.4' }}>
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
              style={{ backgroundColor: 'var(--color-warning)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Nudge Inactive Mods
            </button>
          </section>
        )}

        {/* Top Intelligence Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          <section style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
            <BarChart data={data.dailyTotals} title="7-Day Activity Radar" />
          </section>

          <section style={{ backgroundColor: 'var(--color-neutral-background-strong)', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid var(--color-neutral-border)' }}>
            <Leaderboard data={data.leaderboard} />
          </section>
        </div>

        {/* Full-Width Heatmap */}
        <section style={{ backgroundColor: 'white', padding: '24px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid #EDEFF1' }}>
          <Heatmap data={data.heatmapData} title="Subreddit Coverage Heatmap (24/7 Matrix)" />
        </section>
      </main>

      <footer style={{ marginTop: '40px', paddingBottom: '30px', textAlign: 'center', color: 'var(--color-neutral-content-weak)', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 'bold', color: 'var(--color-neutral-content)' }}>ModVigil v1.0.0 (Production Ready)</div>
        <div style={{ opacity: 0.6, fontStyle: 'italic' }}>Designed for Reddit Moderators with ❤️ by the ModVigil Team</div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', marginTop: '10px' }}>
          <span style={{ backgroundColor: 'var(--color-neutral-background-weak)', padding: '2px 8px', borderRadius: '4px' }}>System Stable</span>
          <span style={{ backgroundColor: 'var(--color-neutral-background-weak)', padding: '2px 8px', borderRadius: '4px' }}>Last Updated: Just Now</span>
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
        /* Reddit Theme Tokens - Adapts to light/dark mode */
        :root {
          --color-primary: #FF4500;
          --color-primary-hover: #FF5722;
          --color-neutral-background: #DAE0E6;
          --color-neutral-background-weak: #F6F7F8;
          --color-neutral-background-strong: #FFFFFF;
          --color-neutral-border: #EDEFF1;
          --color-neutral-content: #1A1A1B;
          --color-neutral-content-weak: #878A8C;
          --color-success: #46D160;
          --color-warning: #FFB000;
          --color-danger: #EA0027;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --color-primary: #FF4500;
            --color-primary-hover: #FF5722;
            --color-neutral-background: #030303;
            --color-neutral-background-weak: #1A1A1B;
            --color-neutral-background-strong: #272729;
            --color-neutral-border: #343536;
            --color-neutral-content: #D7DADC;
            --color-neutral-content-weak: #818384;
            --color-success: #46D160;
            --color-warning: #FFB000;
            --color-danger: #EA0027;
          }
        }

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
