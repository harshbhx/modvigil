/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useState } from 'react';

interface SettingsModalProps {
  onClose: () => void;
  currentSettings: {
    spikeThreshold: number;
    transparencyMode: boolean;
    enableWarnings: boolean;
  };
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, currentSettings }) => {
  const [spikeThreshold, setSpikeThreshold] = useState(currentSettings.spikeThreshold);
  const [transparencyMode, setTransparencyMode] = useState(currentSettings.transparencyMode);
  const [enableWarnings, setEnableWarnings] = useState(currentSettings.enableWarnings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Note: In a real implementation, this would call context.settings.set()
    // For now, we just show a success message
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

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
          maxWidth: '600px',
          width: '100%',
          padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#1A1A1B' }}>
            ⚙️ Settings
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

        {saved && (
          <div style={{
            padding: '12px',
            backgroundColor: '#D4EDDA',
            border: '1px solid #C3E6CB',
            borderRadius: '8px',
            marginBottom: '20px',
            color: '#155724',
            fontSize: '14px',
            fontWeight: '600',
          }}>
            ✅ Settings saved successfully!
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Spike Threshold */}
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '700', color: '#1A1A1B', marginBottom: '8px' }}>
              🚨 Spike Detection Threshold
            </label>
            <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#878A8C', lineHeight: '1.5' }}>
              Alert when activity exceeds baseline by this multiplier. Lower = more sensitive.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <input
                type="range"
                min="1.5"
                max="5"
                step="0.5"
                value={spikeThreshold}
                onChange={(e) => setSpikeThreshold(parseFloat(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <div style={{
                backgroundColor: '#F6F7F8',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '700',
                color: '#FF4500',
                minWidth: '60px',
                textAlign: 'center',
              }}>
                {spikeThreshold}×
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '12px', color: '#878A8C' }}>
              <span>More alerts</span>
              <span>Fewer alerts</span>
            </div>
          </div>

          {/* Transparency Mode */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={transparencyMode}
                onChange={(e) => setTransparencyMode(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1B' }}>
                  📢 Transparency Mode
                </div>
                <div style={{ fontSize: '13px', color: '#878A8C', marginTop: '4px' }}>
                  Post weekly digest publicly (instead of mod-only modmail)
                </div>
              </div>
            </label>
          </div>

          {/* Enable Warnings */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableWarnings}
                onChange={(e) => setEnableWarnings(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#1A1A1B' }}>
                  ⚠️ Automated User Warnings
                </div>
                <div style={{ fontSize: '13px', color: '#878A8C', marginTop: '4px' }}>
                  Send progressive warning PMs to users with multiple removals
                </div>
              </div>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#F6F7F8',
              color: '#1A1A1B',
              border: '1px solid #EDEFF1',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saved}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: saved ? '#46D160' : '#FF4500',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: saved ? 'default' : 'pointer',
              opacity: saved ? 0.8 : 1,
            }}
          >
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
