import React, { useState } from 'react';
import Dashboard from './pages/Dashboard';
import EvalDashboard from './pages/EvalDashboard';
import HITLPanel from './pages/HITLPanel';
import './index.css';

const TABS = [
  { id: 'cases',  label: 'Case Feed' },
  { id: 'hitl',   label: 'Review Queue' },
  { id: 'evals',  label: 'Eval Scorecard' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('cases');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">⚡</span>
          <span className="brand-name">ServiceSense</span>
          <span className="brand-tagline">AI Case Resolution Agent</span>
          <span style={{ fontSize: 10, color: '#475569', marginLeft: 8 }}>By Surya Prabhav Gurram</span>
        </div>
        <nav className="header-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'cases' && <Dashboard />}
        {activeTab === 'hitl'  && <HITLPanel />}
        {activeTab === 'evals' && <EvalDashboard />}
      </main>
    </div>
  );
}
