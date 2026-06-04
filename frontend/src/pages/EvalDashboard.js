import React, { useState, useEffect } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { apiFetch } from '../hooks/api';

export default function EvalDashboard() {
  const [scores,  setScores]  = useState([]);
  const [recent,  setRecent]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/eval/scores'),
      apiFetch('/api/eval/recent')
    ]).then(([s, r]) => {
      setScores(s);
      setRecent(r);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function runEval(caseId) {
    try {
      const result = await apiFetch('/api/eval/score', {
        method: 'POST',
        body: { caseId }
      });
      alert(`Eval complete!\nOverall score: ${result.overall}\n${result.reasoning}`);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  if (loading) return <div className="loading">Loading eval data...</div>;

  // Radar chart data (latest eval version's dimension scores)
  const latestEval = recent[0]?.metadata;
  const radarData = latestEval ? [
    { dimension: 'Empathy',      score: (latestEval.empathy || 0) * 100 },
    { dimension: 'Accuracy',     score: (latestEval.accuracy || 0) * 100 },
    { dimension: 'Clarity',      score: (latestEval.clarity || 0) * 100 },
    { dimension: 'Tone',         score: (latestEval.tone || 0) * 100 },
    { dimension: 'Completeness', score: (latestEval.completeness || 0) * 100 },
  ] : [];

  // Bar chart data — score over recent evals
  const barData = recent.slice(0, 15).reverse().map((r, i) => ({
    name: `#${i+1}`,
    score: parseFloat((r.score * 100).toFixed(1)),
    category: r.category || 'general'
  }));

  const versionSummary = scores[0];

  return (
    <div>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 20 }}>
        Eval Scorecard — LLM-as-Judge
      </h2>

      {/* Summary Cards */}
      {versionSummary && (
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Prompt Version</div>
            <div className="stat-value">{versionSummary.prompt_version}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Evals Run</div>
            <div className="stat-value">{versionSummary.total_evals}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Avg Score</div>
            <div className="stat-value" style={{ color: '#4ade80' }}>
              {(versionSummary.avg_score * 100).toFixed(1)}%
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Score Range</div>
            <div className="stat-value" style={{ fontSize: 18 }}>
              {(versionSummary.min_score * 100).toFixed(0)}–{(versionSummary.max_score * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      )}

      <div className="eval-grid">
        {/* Radar Chart - dimension breakdown */}
        <div className="eval-card">
          <div className="eval-card-title">Latest Eval — Dimension Breakdown</div>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2d3140" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <Radar dataKey="score" stroke="#2563eb" fill="#2563eb" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-icon">📊</div>
              <div className="empty-text">No evals yet. Run the eval suite: npm run eval:run</div>
            </div>
          )}
        </div>

        {/* Bar Chart - score trend */}
        <div className="eval-card">
          <div className="eval-card-title">Score Trend — Last 15 Evals</div>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3140" />
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#16181f', border: '1px solid #2d3140', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  formatter={v => [`${v}%`, 'Score']}
                />
                <Bar dataKey="score" fill="#7c3aed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty" style={{ padding: 40 }}>
              <div className="empty-icon">📈</div>
              <div className="empty-text">Run evals to see trend data</div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Eval Results Table */}
      <div className="eval-card" style={{ marginTop: 0 }}>
        <div className="eval-card-title">Recent Individual Eval Results</div>
        {recent.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🔬</div>
            <div className="empty-text">No eval results yet. Run: <code>npm run eval:run</code> in the backend.</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Case</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Category</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Version</th>
                <th style={{ textAlign: 'right', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Score</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Judge Reasoning</th>
                <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #2d3140' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #1a1d27' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: '#cbd5e1', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.subject || r.case_id}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span className={`badge badge-category-${r.category || 'general'}`}>{r.category || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b' }}>{r.prompt_version}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <span style={{
                      fontWeight: 700, fontSize: 13,
                      color: r.score >= 0.8 ? '#4ade80' : r.score >= 0.6 ? '#facc15' : '#f87171'
                    }}>
                      {(r.score * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#64748b', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.reasoning}
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#475569' }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Run eval on individual case */}
      <div className="eval-card" style={{ marginTop: 20 }}>
        <div className="eval-card-title">Run Eval on a Specific Case</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            id="eval-case-id"
            style={{
              flex: 1, background: '#0f1117', border: '1px solid #2d3140', borderRadius: 8,
              padding: '8px 14px', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit'
            }}
            placeholder="Enter Salesforce Case ID or eval_001, eval_002..."
          />
          <button
            className="btn btn-approve"
            onClick={() => {
              const id = document.getElementById('eval-case-id').value.trim();
              if (id) runEval(id);
            }}
          >
            Run Eval
          </button>
        </div>
      </div>
    </div>
  );
}
