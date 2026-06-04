import React from 'react';

export function SentimentBadge({ value }) {
  return <span className={`badge badge-sentiment-${value}`}>{value}</span>;
}

export function UrgencyBadge({ value }) {
  return <span className={`badge badge-urgency-${value}`}>{value}</span>;
}

export function CategoryBadge({ value }) {
  return <span className={`badge badge-category-${value}`}>{value}</span>;
}

export function StatusBadge({ value }) {
  const cls = value === 'Resolved' ? 'resolved'
            : value === 'Pending Review' ? 'review'
            : 'open';
  return <span className={`badge badge-${cls}`}>{value}</span>;
}

export function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  const color = pct >= 80 ? '#4ade80' : pct >= 60 ? '#facc15' : '#f87171';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="confidence-bar" style={{ flex: 1 }}>
        <div className="confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 32 }}>{pct}%</span>
    </div>
  );
}
