/** @jsxRuntime classic */
/** @jsx React.createElement */
import React, { useState } from 'react';

export interface AutoModSuggestion {
  id: string;
  icon: string;
  title: string;
  pattern: string;
  weeklySavingsMin: number;
  yaml: string;
  caveat: string;
}

interface AutoModSuggestionsProps {
  suggestions: AutoModSuggestion[];
}

export const AutoModSuggestions: React.FC<AutoModSuggestionsProps> = ({ suggestions }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (suggestions.length === 0) {
    return null;
  }

  const totalSavings = suggestions.reduce((s, x) => s + x.weeklySavingsMin, 0);

  const copyYaml = async (suggestion: AutoModSuggestion) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(suggestion.yaml);
      } else {
        const ta = document.createElement('textarea');
        ta.value = suggestion.yaml;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedId(suggestion.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      console.error('[AutoModSuggestions] copy failed', e);
    }
  };

  return (
    <section
      style={{
        backgroundColor: 'var(--color-neutral-background-strong)',
        padding: '24px',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        border: '1px solid var(--color-neutral-border)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: 'var(--color-neutral-content)' }}>
          🤖 AutoMod Rule Suggestions
        </h3>
        <span style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)' }}>
          based on last 7 days · could save ~{Math.round(totalSavings)} min/week
        </span>
      </div>
      <p style={{ margin: '0 0 16px 0', fontSize: '12px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.5' }}>
        Pattern-matched rules tailored to your subreddit. Click to expand and copy the YAML — paste into{' '}
        <code style={{ background: 'var(--color-neutral-background-weak)', padding: '1px 5px', borderRadius: '4px' }}>
          r/yoursubreddit/wiki/config/automoderator
        </code>.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {suggestions.map(s => {
          const isOpen = expandedId === s.id;
          const isCopied = copiedId === s.id;
          return (
            <div
              key={s.id}
              style={{
                border: '1px solid var(--color-neutral-border)',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: 'var(--color-neutral-background-weak)',
              }}
            >
              <button
                onClick={() => setExpandedId(isOpen ? null : s.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--color-neutral-content)',
                }}
              >
                <div style={{ fontSize: '24px', lineHeight: '1', flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '4px' }}>{s.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.4' }}>{s.pattern}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '900', color: 'var(--color-success)' }}>
                    ~{s.weeklySavingsMin}m/wk
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '2px' }}>
                    {isOpen ? '▴ collapse' : '▾ expand'}
                  </div>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '0 16px 16px 16px' }}>
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: 'var(--color-warning)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '6px',
                    }}
                  >
                    ⚠️ Caveat
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', lineHeight: '1.5', marginBottom: '12px' }}>
                    {s.caveat}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-neutral-content-weak)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      AutoMod YAML
                    </span>
                    <button
                      onClick={() => copyYaml(s)}
                      style={{
                        background: isCopied ? 'var(--color-success)' : 'var(--color-primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                    >
                      {isCopied ? '✓ Copied' : '📋 Copy'}
                    </button>
                  </div>
                  <pre
                    style={{
                      margin: 0,
                      background: 'var(--color-neutral-background-strong)',
                      border: '1px solid var(--color-neutral-border)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '11px',
                      lineHeight: '1.5',
                      color: 'var(--color-neutral-content)',
                      overflow: 'auto',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                      whiteSpace: 'pre',
                    }}
                  >
                    {s.yaml}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
