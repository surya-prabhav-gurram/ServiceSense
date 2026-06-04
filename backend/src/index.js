require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const classifyRoutes = require('./routes/classify');
const draftRoutes    = require('./routes/draft');
const hitlRoutes     = require('./routes/hitl');
const evalRoutes     = require('./routes/eval');
const casesRoutes    = require('./routes/cases');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────
app.use('/api/classify', classifyRoutes);  // Called by Salesforce Apex
app.use('/api/draft',    draftRoutes);     // RAG-powered draft generation
app.use('/api/hitl',     hitlRoutes);      // Human-in-the-loop decisions
app.use('/api/eval',     evalRoutes);      // LLM-as-judge evals
app.use('/api/cases',    casesRoutes);     // Case feed for React dashboard

// ─── Health check ─────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handler ────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`ServiceSense backend running on port ${PORT}`);
});
