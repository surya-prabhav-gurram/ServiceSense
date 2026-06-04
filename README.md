# ServiceSense — AI Case Resolution Agent

> An Agentforce-style AI customer support agent built on Salesforce Service Cloud, Claude API, pgvector RAG, and React.

---

## Architecture

```
Salesforce Org
│
├── CaseTrigger (AFTER INSERT on Case)
│   └── CaseAIHandler.cls  ──────────────────► Node.js Backend
│       └── HTTP Callout                           │
│                                                  ├── /classify  → Claude API
│                                                  │   └── {sentiment, urgency, category, confidence}
│                                                  │
│                                                  ├── /draft     → pgvector RAG + Claude API
│                                                  │   └── draft response from knowledge base
│                                                  │
│                                                  └── /eval      → LLM-as-judge
│                                                      └── {score, reasoning}
│
├── CaseResolutionAction.cls (@InvocableMethod)
│   └── Called by Agentforce flows / Apex to update Case
│
└── React Dashboard (serviceSenseDashboard LWC + standalone React app)
    ├── Live case feed with AI classifications
    ├── HITL approval panel (approve/reject drafts)
    └── Eval scorecard (prompt version comparison)
```

---

## Stack

| Layer | Technology |
|---|---|
| CRM / Triggers | Salesforce Apex, Service Cloud |
| AI | Claude API (claude-sonnet-4) |
| RAG | pgvector (PostgreSQL), Node.js |
| Backend | Node.js + Express |
| Frontend | React + Recharts + Tailwind |
| Database | PostgreSQL (pgvector extension) |
| Deploy | Railway (backend + DB) |

---

## Project Structure

```
ServiceSense/
├── salesforce/                  # Salesforce DX project
│   └── force-app/main/default/
│       ├── triggers/            # CaseTrigger.trigger
│       ├── classes/             # CaseAIHandler, CaseResolutionAction, etc.
│       └── lwc/                 # Lightning Web Component dashboard
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── routes/              # classify, draft, eval, hitl endpoints
│   │   ├── services/            # Claude, pgvector, RAG services
│   │   ├── prompts/             # Versioned prompt files
│   │   └── evals/               # LLM-as-judge eval runner
│   └── data/                    # Seed knowledge base articles
├── frontend/                    # React dashboard
│   └── src/
│       ├── components/          # CaseFeed, HITLPanel, EvalScorecard
│       └── pages/               # Dashboard, EvalDashboard
└── docs/                        # Architecture diagrams
```

---

## Setup Guide

### Prerequisites
- Node.js 18+
- PostgreSQL with pgvector extension
- Salesforce Developer Edition org
- Anthropic API key

### 1. Salesforce Setup

```bash
# Install Salesforce CLI
brew install sf   # Mac
# or download from developer.salesforce.com/tools/salesforcecli

# Login to your org
sf org login web --alias ServiceSense

# Deploy metadata
cd salesforce
sf project deploy start --target-org ServiceSense

# Set Named Credential for backend URL
# Setup → Named Credentials → New
# Name: ServiceSenseBackend
# URL: https://your-railway-app.railway.app
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in: ANTHROPIC_API_KEY, DATABASE_URL, SALESFORCE_*

# Setup database
npm run db:setup

# Seed knowledge base
npm run db:seed

# Start dev server
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in: REACT_APP_API_URL

npm start
```

### 4. Deploy to Railway

```bash
# Backend
cd backend
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

---

## Resume Bullet

```
ServiceSense – AI Case Resolution Agent | Apex, Claude API, React, pgvector, Salesforce Service Cloud

- Built Apex Triggers and @InvocableMethod actions to intercept incoming Salesforce Cases
  and enqueue LLM classification jobs for sentiment, urgency, and routing — zero manual triage.
- Designed a RAG-powered response drafting pipeline (pgvector) with Human-in-the-Loop approval
  for low-confidence cases, keeping agents in control of customer-facing output.
- Implemented LLM-as-judge eval system scoring draft quality across prompt versions —
  making response quality measurable and improvable over time.
```
