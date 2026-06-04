import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../hooks/api';
import { SentimentBadge, UrgencyBadge, CategoryBadge, ConfidenceBar } from '../components/Badges';

export default function HITLPanel() {
  const [queue,   setQueue]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState({});   // caseId -> edited draft text
  const [notes,   setNotes]   = useState({});   // caseId -> reviewer notes
  const [working, setWorking] = useState(null); // caseId being submitted

  const loadQueue = useCallback(async () => {
    try {
      const data = await apiFetch('/api/hitl/queue');
      setQueue(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  async function decide(caseId, decision) {
    setWorking(caseId);
    try {
      await apiFetch('/api/hitl/decision', {
        method: 'POST',
        body: {
          caseId,
          decision,
          finalResponse: editing[caseId] || undefined,
          reviewerNotes: notes[caseId] || undefined
        }
      });
      setQueue(q => q.filter(c => c.id !== caseId));
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setWorking(null);
    }
  }

  if (loading) return <div className="loading">Loading review queue...</div>;

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>Human Review Queue</h2>
        <span style={{ background: '#78350f', color: '#fed7aa', borderRadius: 12, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
          {queue.length} pending
        </span>
        <button className="btn btn-secondary" onClick={loadQueue} style={{ marginLeft: 'auto' }}>
          ↻ Refresh
        </button>
      </div>

      {queue.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">✅</div>
          <div className="empty-text">All caught up! No cases need review right now.</div>
        </div>
      ) : queue.map(c => (
        <div key={c.id} className="hitl-card">
          <div className="hitl-card-header">
            <div>
              <div className="hitl-card-subject">{c.subject}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                {new Date(c.created_at).toLocaleString()} · Case ID: {c.id}
              </div>
            </div>
            <div>
              <ConfidenceBar value={c.confidence} />
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2, textAlign: 'right' }}>
                confidence
              </div>
            </div>
          </div>

          <div className="hitl-card-meta">
            <SentimentBadge value={c.sentiment} />
            <UrgencyBadge value={c.urgency} />
            <CategoryBadge value={c.category} />
          </div>

          <div className="hitl-card-description">{c.description}</div>

          {c.reasoning && (
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12, fontStyle: 'italic' }}>
              AI: {c.reasoning}
            </div>
          )}

          {/* Editable draft */}
          <div className="draft-box">
            <div className="draft-label">AI Draft Response (editable)</div>
            <textarea
              className="draft-edit"
              rows={5}
              value={editing[c.id] !== undefined ? editing[c.id] : (c.draft || '')}
              onChange={e => setEditing(ed => ({ ...ed, [c.id]: e.target.value }))}
            />
          </div>

          {/* Reviewer notes */}
          <div style={{ marginBottom: 16 }}>
            <input
              style={{
                width: '100%', background: '#0f1117', border: '1px solid #2d3140',
                borderRadius: 6, padding: '8px 12px', color: '#94a3b8', fontSize: 12,
                fontFamily: 'inherit'
              }}
              placeholder="Reviewer notes (optional, internal)"
              value={notes[c.id] || ''}
              onChange={e => setNotes(n => ({ ...n, [c.id]: e.target.value }))}
            />
          </div>

          <div className="hitl-actions">
            <button
              className="btn btn-approve"
              disabled={working === c.id}
              onClick={() => decide(c.id, 'approve')}
            >
              {working === c.id ? '...' : '✓ Approve & Send'}
            </button>
            <button
              className="btn btn-reject"
              disabled={working === c.id}
              onClick={() => decide(c.id, 'reject')}
            >
              ✕ Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
