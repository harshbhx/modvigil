/** @jsxRuntime classic */
/** @jsx React.createElement */
import React from 'react';

interface QuickStatsProps {
  totalActionsToday: number;
  approvalRate: number;
  topRemovalReason: string | null;
}

export const QuickStats: React.FC<QuickStatsProps> = ({ totalActionsToday, approvalRate, topRemovalReason }) => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '24px',
    }}>
      {/* Total Actions Today */}
      <div style={{
        backgroundColor: 'var(--color-neutral-background-strong)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--color-neutral-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Total Actions Today
        </div>
        <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--color-primary)', lineHeight: '1' }}>
          {totalActionsToday}
        </div>
      </div>

      {/* Approval Rate */}
      <div style={{
        backgroundColor: 'var(--color-neutral-background-strong)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--color-neutral-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Approval Rate
        </div>
        <div style={{ fontSize: '32px', fontWeight: '900', color: approvalRate >= 30 ? 'var(--color-success)' : 'var(--color-primary)', lineHeight: '1' }}>
          {approvalRate.toFixed(1)}%
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-neutral-content-weak)', marginTop: '4px' }}>
          {(100 - approvalRate).toFixed(1)}% removals
        </div>
      </div>

      {/* Top Removal Reason */}
      <div style={{
        backgroundColor: 'var(--color-neutral-background-strong)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid var(--color-neutral-border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: '12px', color: 'var(--color-neutral-content-weak)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
          Top Removal Action
        </div>
        <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--color-neutral-content)', lineHeight: '1.3' }}>
          {topRemovalReason || 'No removals yet'}
        </div>
      </div>
    </div>
  );
};
