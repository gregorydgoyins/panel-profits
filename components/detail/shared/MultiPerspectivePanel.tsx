'use client';
import React, { useState } from 'react';
import { Globe, Building2, ShieldAlert, UserCheck } from 'lucide-react';

export interface PerspectiveData {
  marketTruth: {
    consensusFmv: number;
    lastSalePrice?: number | null;
    lastSaleDate?: string | null;
    salesVolume24h?: number | null;
    marketState: string;
    confidence: number;
  };
  firmView?: {
    firmName?: string;
    firmAumAllocation?: string;
    targetPrice?: number | null;
    convictionRating?: string;
    firmExposures?: string[];
  } | null;
  deskView?: {
    operationalStatus: string;
    priorityLevel: string;
    callbackUrgency?: string;
    executionLiquidity: string;
  } | null;
  brokerView?: {
    portfolioPosition?: string;
    costBasis?: number | null;
    unrealizedPl?: string;
    recommendedAction?: string;
  } | null;
}

interface Props {
  data: PerspectiveData;
  accentColor?: string;
}

export function MultiPerspectivePanel({ data, accentColor = '#60a5fa', ...rest }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'market' | 'firm' | 'desk' | 'broker'>('all');

  const marketTruth = data?.marketTruth ?? {
    consensusFmv: rest.marketValue ? (parseFloat(String(rest.marketValue).replace(/[^0-9.]/g, '')) || null) : null,
    lastSalePrice: null,
    lastSaleDate: null,
    salesVolume24h: null,
    marketState: 'Active',
    confidence: null,
  };
  const firmView = data?.firmView ?? null;
  const deskView = data?.deskView ?? null;
  const brokerView = data?.brokerView ?? null;

  const perspectives = [
    {
      id: 'market',
      title: 'MARKET / WORLD TRUTH',
      subtitle: 'Public consensus & verified transaction data',
      icon: Globe,
      color: '#60a5fa',
      badge: marketTruth.confidence != null ? `${marketTruth.confidence}% CONFIDENCE` : 'DATA_INCOMPLETE',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>CONSENSUS FMV</span>
            <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff', fontFamily: 'Hind, sans-serif' }}>
              {marketTruth.consensusFmv != null && !isNaN(marketTruth.consensusFmv) && marketTruth.consensusFmv > 0
                ? `$${marketTruth.consensusFmv.toLocaleString()}`
                : 'DATA_INCOMPLETE'}
            </span>
          </div>
          {marketTruth.lastSalePrice != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>LAST VERIFIED SALE</span>
              <span style={{ color: '#4ade80' }}>
                ${marketTruth.lastSalePrice.toLocaleString()} {marketTruth.lastSaleDate ? `(${marketTruth.lastSaleDate})` : ''}
              </span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>MARKET REGIME</span>
            <span style={{ color: '#93c5fd', textTransform: 'uppercase' }}>{marketTruth.marketState || 'DATA_INCOMPLETE'}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'firm',
      title: 'INSTITUTIONAL / FIRM VIEW',
      subtitle: 'Arnveld & 25-firm allocation posture',
      icon: Building2,
      color: '#f59e0b',
      badge: firmView?.convictionRating ?? 'PENDING COVERAGE',
      content: firmView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>FIRM</span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', fontFamily: 'Hind, sans-serif' }}>
              {firmView.firmName || 'RESEARCH DESK'}
            </span>
          </div>
          {firmView.targetPrice != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>FIRM TARGET PRICE</span>
              <span style={{ color: '#fbbf24' }}>${firmView.targetPrice.toLocaleString()}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>ALLOCATION EXPOSURE</span>
            <span style={{ color: '#fcd34d' }}>{firmView.firmAumAllocation || 'DATA_INCOMPLETE'}</span>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontFamily: 'Hind, sans-serif' }}>
          Firm research note pending coverage update
        </div>
      ),
    },
    {
      id: 'desk',
      title: 'DESK / OPERATIONAL VIEW',
      subtitle: 'Manhattan desk execution & signal priority',
      icon: ShieldAlert,
      color: '#10b981',
      badge: deskView?.priorityLevel ?? 'NORMAL',
      content: deskView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>DESK STATUS</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#34d399', fontFamily: 'Hind, sans-serif', textTransform: 'uppercase' }}>
              {deskView.operationalStatus}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
            <span style={{ color: 'rgba(255,255,255,0.45)' }}>EXECUTION LIQUIDITY</span>
            <span style={{ color: '#6ee7b7' }}>{deskView.executionLiquidity}</span>
          </div>
          {deskView.callbackUrgency && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>CLIENT ACTION</span>
              <span style={{ color: '#a7f3d0' }}>{deskView.callbackUrgency}</span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontFamily: 'Hind, sans-serif' }}>
          Desk queue clear — standard order routing active
        </div>
      ),
    },
    {
      id: 'broker',
      title: 'YOUR / BROKER VIEW',
      subtitle: 'Personal portfolio exposure & recommended posture',
      icon: UserCheck,
      color: '#a855f7',
      badge: brokerView?.recommendedAction ?? 'NEUTRAL',
      content: brokerView ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', fontFamily: 'monospace' }}>PORTFOLIO POSITION</span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#c084fc', fontFamily: 'Hind, sans-serif' }}>
              {brokerView.portfolioPosition || '0 Units (Flat)'}
            </span>
          </div>
          {brokerView.costBasis != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>AVG COST BASIS</span>
              <span style={{ color: '#e9d5ff' }}>${brokerView.costBasis.toLocaleString()}</span>
            </div>
          )}
          {brokerView.unrealizedPl && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>UNREALIZED P&L</span>
              <span style={{ color: brokerView.unrealizedPl.startsWith('+') ? '#4ade80' : '#f87171' }}>
                {brokerView.unrealizedPl}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontFamily: 'Hind, sans-serif' }}>
          No open position on personal desk
        </div>
      ),
    },
  ];

  return (
    <div
      style={{
        backgroundColor: '#070c18',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '6px',
        padding: '16px',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: 'Hind, sans-serif', letterSpacing: '0.02em', margin: 0 }}>
            FOUR-LEVEL INSTITUTIONAL PERSPECTIVE
          </h3>
          <p style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.45)', fontFamily: 'Hind, sans-serif', margin: '2px 0 0' }}>
            Multi-tier analytical consensus distinguishing public truth, firm posture, desk urgency, and personal exposure
          </p>
        </div>

        {/* Tab filters */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['all', 'market', 'firm', 'desk', 'broker'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                fontSize: '9px',
                fontFamily: 'monospace',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: '3px',
                border: activeTab === tab ? `1px solid ${accentColor}` : '1px solid rgba(255,255,255,0.1)',
                backgroundColor: activeTab === tab ? `${accentColor}20` : 'transparent',
                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of perspective cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
        }}
      >
        {perspectives
          .filter((p) => activeTab === 'all' || activeTab === p.id)
          .map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.id}
                style={{
                  backgroundColor: '#040812',
                  border: `1px solid ${p.color}35`,
                  borderTop: `2px solid ${p.color}`,
                  borderRadius: '4px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Icon style={{ width: 14, height: 14, color: p.color }} />
                    <span style={{ fontSize: '10px', fontFamily: 'monospace', fontWeight: 600, color: p.color, letterSpacing: '0.08em' }}>
                      {p.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '8px',
                      fontFamily: 'monospace',
                      color: p.color,
                      backgroundColor: `${p.color}15`,
                      border: `1px solid ${p.color}35`,
                      borderRadius: '2px',
                      padding: '1px 5px',
                    }}
                  >
                    {p.badge}
                  </span>
                </div>
                <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.4)', fontFamily: 'Hind, sans-serif', marginTop: '-4px' }}>
                  {p.subtitle}
                </div>
                <div style={{ marginTop: '2px' }}>{p.content}</div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

export default MultiPerspectivePanel;
