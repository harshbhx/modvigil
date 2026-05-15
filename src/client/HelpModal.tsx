/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

export const HelpModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          maxWidth: '700px',
          maxHeight: '80vh',
          overflow: 'auto',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1A1A1B' }}>
            📚 ModVigil Help Guide
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#878A8C',
              padding: '0',
              width: '32px',
              height: '32px',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', color: '#1A1A1B' }}>
          {/* Health Score */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              🏥 Health Score (0-100)
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', color: '#1A1A1B', fontSize: '14px' }}>
              Measures your subreddit's moderation health based on:
            </p>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              <li><strong>70% Coverage:</strong> How many hours per day have mod activity</li>
              <li><strong>30% Volume:</strong> Total moderation actions per week</li>
            </ul>
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#F6F7F8', borderRadius: '8px', fontSize: '13px' }}>
              <strong>90-100:</strong> Elite (24/7 coverage) • <strong>70-89:</strong> Stable • <strong>0-69:</strong> Critical
            </div>
          </section>

          {/* Heatmap */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              🗺️ Coverage Heatmap
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
              Shows moderation activity across 7 days × 24 hours. Each cell represents one hour.
            </p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#dc2626', opacity: 0.12, borderRadius: '2px' }}></div>
                <span>Red = Coverage gap</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#FF4500', opacity: 0.3, borderRadius: '2px' }}></div>
                <span>Light = Low activity</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: '#FF4500', opacity: 1, borderRadius: '2px' }}></div>
                <span>Dark = High activity</span>
              </div>
            </div>
          </section>

          {/* Approval Rate */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              ✅ Approval Rate
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
              Percentage of mod actions that approve content (vs. remove). Higher rate = more permissive moderation.
            </p>
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#F6F7F8', borderRadius: '8px', fontSize: '13px' }}>
              <strong>Typical range:</strong> 20-40% approval rate is normal for active communities
            </div>
          </section>

          {/* Spike Detection */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              🚨 Spike Detection
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
              Automatically detects unusual activity spikes by comparing current hour to 7-week baseline. Sends modmail alert when activity exceeds 3× normal levels.
            </p>
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#FFF3CD', borderRadius: '8px', fontSize: '13px', border: '1px solid #FFE4B5' }}>
              <strong>⚡ Pro Tip:</strong> Spike alerts help catch raids, brigades, and viral posts before they overwhelm your queue.
            </div>
          </section>

          {/* Ghost Mods */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              👻 Ghost Moderators
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
              Moderators who haven't performed any actions in 30+ days. Consider reviewing their permissions or reaching out.
            </p>
          </section>

          {/* Progressive Warnings */}
          <section>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#FF4500', marginBottom: '8px' }}>
              ⚠️ Progressive User Warnings
            </h3>
            <p style={{ margin: 0, lineHeight: '1.6', fontSize: '14px' }}>
              Automatically sends escalating PMs to users based on removal count:
            </p>
            <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '14px', lineHeight: '1.6' }}>
              <li><strong>2 removals:</strong> Friendly reminder</li>
              <li><strong>3 removals:</strong> Final warning</li>
              <li><strong>4+ removals:</strong> Flagged for manual mod review (no auto-ban)</li>
            </ul>
          </section>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '24px',
            width: '100%',
            padding: '12px',
            backgroundColor: '#FF4500',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  );
};
