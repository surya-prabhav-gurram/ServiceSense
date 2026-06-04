# ServiceSense — AI Case Resolution Agent

> An Agentforce-style AI customer support agent built on Salesforce Service Cloud, Claude API, pgvector RAG, and React. Automatically classifies incoming support cases, generates RAG-powered draft responses, and surfaces high-priority cases for human review — all in under 10 seconds.

**Live Demo:** [discerning-inspiration-production-7528.up.railway.app](https://discerning-inspiration-production-7528.up.railway.app)
**Backend API:** [servicesense-production.up.railway.app](https://servicesense-production.up.railway.app)

---

## What It Does

When a Case is created in Salesforce:

1. **CaseTrigger** fires and enqueues an async Apex job
2. **CaseAIHandler** calls the backend to classify the case — returning sentiment, urgency, category, and confidence score
3. A **RAG-powered draft response** is generated using pgvector similarity search over a knowledge base
4. If confidence < 70%, the case is flagged for **Human-in-the-Loop (HITL)** review
5. All AI fields are written back to the Salesforce Case record automatically
6. The **React dashboard** shows the live case feed, review queue, and eval scorecard

---

## Architecture

```
Salesforce Org
│
├── CaseTrigger (AFTER INSERT on Case)
│   └── CaseAIHandler.cls (Queueable Apex)
│       └── Named Credential callout ──────────────► Node.js Backend (Railway)
│                                                          │
│                                                          ├── POST /api/classify
│                                                          │   └── Claude API → {sentiment, urgency, category, confidence}
│                                                          │
│                                                          ├── POST /api/draft
│                                                          │   └── pgvector RAG + Claude API → draft response
│                                                          │
│                                                          ├── POST /api/hitl
│                                                          │   └── approve / reject drafts
│                                                          │
│                                                          └── POST /api/eval
│                                                              └── LLM-as-judge scoring
│
├── CaseResolutionAction.cls (@InvocableMethod)
│   └── Callable from Agentforce flows to approve/reject drafts
│
└── React Dashboard (Railway)
    ├── Case Feed — live table with AI classifications
    ├── Review Queue — HITL panel with editable drafts
    └── Eval Scorecard — radar + bar charts across prompt versions
```

---

## Stack

| Layer | Technology |
|---|---|
| CRM / Triggers | Salesforce Apex, Service Cloud |
| AI | Claude API (claude-sonnet-4-5) |
| RAG | pgvector (PostgreSQL), cosine similarity |
| Backend | Node.js + Express |
| Frontend | React + Recharts |
| Database | PostgreSQL + pgvector extension |
| Deploy | Railway (backend + frontend + DB in one project) |
| Source Control | GitHub |

---

## Project Structure

```
ServiceSense/
├── salesforce/
│   └── force-app/main/default/
│       ├── triggers/
│       │   └── CaseTrigger.trigger          # Fires AFTER INSERT on Case
│       ├── classes/
│       │   ├── CaseAIHandler.cls            # Queueable Apex — classify + draft + update
│       │   ├── CaseAIHandlerTest.cls        # Unit tests with mock HTTP callouts
│       │   └── CaseResolutionAction.cls     # @InvocableMethod for Agentforce flows
│       └── objects/Case/fields/
│           ├── AI_Sentiment__c              # positive | neutral | negative | frustrated
│           ├── AI_Urgency__c                # low | medium | high | critical
│           ├── AI_Category__c               # billing | technical | general | complaint
│           ├── AI_Confidence__c             # 0.00–1.00
│           ├── AI_Draft__c                  # RAG-generated response draft
│           ├── AI_Reasoning__c              # Model's classification reasoning
│           └── AI_Needs_Review__c           # HITL flag (confidence < 70%)
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── classify.js                  # POST /api/classify
│   │   │   ├── draft.js                     # POST /api/draft
│   │   │   ├── hitl.js                      # POST /api/hitl
│   │   │   ├── eval.js                      # POST /api/eval
│   │   │   └── cases.js                     # GET /api/cases (dashboard feed)
│   │   ├── services/
│   │   │   ├── claude.js                    # Anthropic SDK wrapper
│   │   │   └── rag.js                       # pgvector similarity search
│   │   ├── prompts/
│   │   │   ├── classify.js                  # Versioned classification prompt
│   │   │   ├── draft.js                     # Versioned drafting prompt
│   │   │   └── judge.js                     # LLM-as-judge eval prompt
│   │   ├── evals/
│   │   │   └── runner.js                    # 15-case eval suite with scoring
│   │   └── db/
│   │       ├── setup.js                     # Creates tables + pgvector extension
│   │       └── seed.js                      # Seeds 8 knowledge base articles
│   └── railway.toml
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js                 # Case Feed with filters
│       │   ├── HITLPanel.js                 # Review Queue with approve/reject
│       │   └── EvalDashboard.js             # Radar + bar chart scorecard
│       ├── components/
│       │   └── Badges.js                    # Sentiment/urgency/category badges
│       └── hooks/
│           └── api.js                       # API calls to backend
│
└── docs/
    └── DEPLOY.md                            # Full deployment guide
```

---

## Setup Guide

### Prerequisites

- Node.js 18+
- PostgreSQL with pgvector extension (or Railway Postgres)
- Salesforce Developer Edition org
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com))
- Salesforce CLI (`brew install sf`)

---

### 1. Clone & Install

```bash
git clone https://github.com/surya-prabhav-gurram/ServiceSense.git
cd ServiceSense
```

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `.env`:

```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=postgresql://user:password@host:port/dbname
PORT=3001
```

```bash
npm run db:setup    # creates tables + pgvector extension
npm run db:seed     # loads 8 knowledge base articles
npm run dev         # starts on http://localhost:3001
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Set REACT_APP_API_URL=http://localhost:3001
npm start           # opens http://localhost:3000
```

---

### 4. Salesforce Setup

```bash
# Login to your org
sf org login web --alias servicesense-dev

# Deploy Apex classes, trigger, and custom fields
cd salesforce
sf project deploy start --target-org servicesense-dev
```

In Salesforce Setup:

1. **Named Credentials** → New Legacy → Name: `ServiceSenseBackend`, URL: your backend URL, Identity Type: Anonymous
2. **Remote Site Settings** → New → URL: your backend URL
3. **Object Manager** → Case → Fields & Relationships → set Field-Level Security to Visible for all `AI_*` fields

---

### 5. Run Evals

```bash
cd backend
npm run eval:run
# Runs 15 test cases through classify + draft + LLM-as-judge
# Prints per-case scores and summary stats
```

---

## Deploy to Railway

Both backend and frontend deploy to Railway from the same GitHub repo using different root directories.

| Service | Root Directory | Port |
|---------|---------------|------|
| Backend | `backend` | `3001` |
| Frontend | `frontend` | `8080` |

**Backend environment variables:**
```
ANTHROPIC_API_KEY=sk-ant-...
DATABASE_URL=<Railway Postgres internal URL>
NODE_ENV=production
```

**Frontend environment variables:**
```
REACT_APP_API_URL=https://your-backend.up.railway.app
```

---

## Eval Results

Run against 15 representative cases across billing, technical, general, and complaint categories:

| Metric | Value |
|--------|-------|
| Cases evaluated | 15 |
| Avg score | 0.800 |
| Min score | 0.660 |
| Max score | 0.910 |
| Prompt version | v1 |

---

## Resume Bullet

```
ServiceSense – AI Case Resolution Agent | Apex, Claude API, React, pgvector, Salesforce Service Cloud

• Built Apex Triggers and @InvocableMethod actions to intercept incoming Salesforce Cases
  and enqueue async LLM classification jobs for sentiment, urgency, and routing — zero manual triage.
• Designed a RAG-powered response drafting pipeline (pgvector cosine similarity) grounded in a
  knowledge base, with Human-in-the-Loop approval for low-confidence cases (<70%).
• Implemented LLM-as-judge eval system scoring draft quality across prompt versions,
  achieving 80% avg score across 15 test cases — making response quality measurable over time.
• Deployed full stack to Railway (backend + frontend + Postgres) with Salesforce Named Credential
  integration; end-to-end latency from case creation to AI fields populated under 10 seconds.
```
