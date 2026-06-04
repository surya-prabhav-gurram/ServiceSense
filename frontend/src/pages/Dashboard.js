import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/api';
import { SentimentBadge, UrgencyBadge, CategoryBadge, ConfidenceBar, StatusBadge } from '../components/Badges';

export default function Dashboard() {
  const [cases, setCases]   = useState([]);
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState({ status: '', category: '' });
  const [selected, setSelected] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status)   params.set('status',   filter.status);
      if (filter.category) params.set('category', filter.category);
      params.set('limit', '50');

      const [casesData, statsData] = await Promise.all([
        apiFetch(`/api/cases?${params}`),
        apiFetch('/api/cases/stats/summary')
      ]);
      setCases(casesData);
      setStats(statsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Cases</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Pending Review</div>
            <div className="stat-value" style={{ color: '#fb923c' }}>{stats.pending_review}</div>
            <div className="stat-sub">Need human approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved</div>
            <div className="stat-value" style={{ color: '#4ade80' }}>{stats.resolved}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">High Priority</div>
            <div className="stat-value" style={{ color: '#f87171' }}>{stats.high_priority}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg AI Confidence</div>
            <div className="stat-value">{stats.avg_confidence_pct}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters">
        <select className="filter-select" value={filter.status}
          onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="New">New</option>
          <option value="In Progress">In Progress</option>
          <option value="Pending Review">Pending Review</option>
          <option value="Resolved">Resolved</option>
          <option value="Open">Open</option>
        </select>
        <select className="filter-select" value={filter.category}
          onChange={e => setFilter(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          <option value="billing">Billing</option>
          <option value="technical">Technical</option>
          <option value="general">General</option>
          <option value="complaint">Complaint</option>
        </select>
        <button className="btn btn-secondary" onClick={load} style={{ marginLeft: 'auto' }}>
          ↻ Refresh
        </button>
      </div>

      {/* Case Table */}
      {loading ? (
        <div className="loading">Loading cases...</div>
      ) : (
        <div className="case-table">
          <div className="case-table-header">
            <span>Subject</span>
            <span>Status</span>
            <span>Sentiment</span>
            <span>Urgency</span>
            <span>Category</span>
            <span>Confidence</span>
          </div>
          {cases.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📭</div>
              <div className="empty-text">No cases yet. Create a Case in Salesforce to get started.</div>
            </div>
          ) : cases.map(c => (
            <div key={c.id} className="case-row" onClick={() => setSelected(c)}>
              <div>
                <div className="case-subject">{c.subject}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                  {new Date(c.created_at).toLocaleString()}
                  {c.needs_review && <span style={{ marginLeft: 8, color: '#fb923c' }}>⚠ Needs Review</span>}
                </div>
              </div>
              <StatusBadge value={c.status} />
              <SentimentBadge value={c.sentiment || '—'} />
              <UrgencyBadge value={c.urgency || '—'} />
              <CategoryBadge value={c.category || '—'} />
              <ConfidenceBar value={c.confidence} />
            </div>
          ))}
        </div>
      )}

      {/* Case Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: '#000a', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}
          onClick={() => setSelected(null)}>
          <div style={{ background: '#16181f', border: '1px solid #2d3140', borderRadius: 16, padding: 28, width: 560, maxHeight: '80vh', overflow: 'auto' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ color: '#fff', fontSize: 16 }}>{selected.subject}</h3>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 18, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatusBadge value={selected.status} />
              <SentimentBadge value={selected.sentiment} />
              <UrgencyBadge value={selected.urgency} />
              <CategoryBadge value={selected.category} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>{selected.description}</p>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>AI CONFIDENCE</div>
            <ConfidenceBar value={selected.confidence} />
            {selected.reasoning && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>AI REASONING</div>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>{selected.reasoning}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
