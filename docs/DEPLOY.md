# ServiceSense — Step-by-Step Deploy Guide

## Phase 1: Salesforce (30 min)

### 1. Create free Developer org
- Go to https://developer.salesforce.com/signup
- Username format: yourname.dev2025@sf.example.com (doesn't need to be real)

### 2. Install Salesforce CLI
```bash
# Mac
brew install sf

# Windows: download from https://developer.salesforce.com/tools/salesforcecli
```

### 3. Connect CLI to your org
```bash
sf org login web --alias ServiceSense
```

### 4. Deploy metadata (custom fields + Apex)
```bash
cd salesforce
sf project deploy start --target-org ServiceSense
```

### 5. Set up Named Credential
After deploying your backend to Railway:
- Salesforce Setup → Named Credentials → New Legacy
- Label: ServiceSenseBackend
- Name: ServiceSenseBackend  ← must match exactly
- URL: https://your-app.railway.app
- Identity Type: Anonymous
- Authentication Protocol: No Authentication

### 6. Set up Remote Site Settings
- Salesforce Setup → Remote Site Settings → New
- Name: ServiceSenseBackend
- URL: https://your-app.railway.app

### 7. Update Queue IDs in CaseAIHandler.cls
- Setup → Queues → copy the 15-char ID from the URL for each queue
- Replace the placeholder IDs in the queueMap in CaseAIHandler.cls
- Redeploy: `sf project deploy start --target-org ServiceSense`

---

## Phase 2: Backend (20 min)

### 1. Get a free PostgreSQL database
- Railway (recommended): https://railway.app → New Project → PostgreSQL
- Copy the DATABASE_URL from the Railway dashboard

### 2. Set up locally
```bash
cd backend
npm install
cp .env.example .env
# Edit .env: add ANTHROPIC_API_KEY and DATABASE_URL
```

### 3. Initialize database
```bash
npm run db:setup
npm run db:seed
```

### 4. Run locally
```bash
npm run dev
# Server starts at http://localhost:3001
# Test: curl http://localhost:3001/health
```

### 5. Deploy to Railway
```bash
npm install -g @railway/cli
railway login
railway init   # in the backend/ directory
railway up

# Set environment variables in Railway dashboard:
# ANTHROPIC_API_KEY = your key
# DATABASE_URL = your postgres URL (Railway links this automatically)
# PORT = 3001
```

---

## Phase 3: Frontend (10 min)

### 1. Run locally
```bash
cd frontend
npm install
cp .env.example .env
# .env: REACT_APP_API_URL=http://localhost:3001

npm start
# Opens at http://localhost:3000
```

### 2. Build for production
```bash
npm run build
# Static files in frontend/build/ — deploy to Vercel or Railway
```

### 3. Deploy to Vercel (easiest)
```bash
npx vercel --cwd frontend
# Set env: REACT_APP_API_URL=https://your-backend.railway.app
```

---

## Phase 4: Run Evals

```bash
cd backend
npm run eval:run
# Runs 15 eval cases, prints scores, stores in DB
# View results in the React dashboard → Eval Scorecard tab
```

---

## Testing the Full Flow

1. Open your Salesforce org
2. Go to Cases → New Case
3. Fill in Subject + Description
4. Save the case
5. Watch CaseTrigger fire → CaseAIHandler enqueues async job
6. In ~10 seconds, refresh the Case — AI fields should be populated
7. Open the React dashboard → Case Feed → see the classified case
8. If confidence < 70%, it appears in Review Queue for HITL approval

---

## Troubleshooting

### Apex callout fails
- Check Named Credential URL matches your Railway deployment
- Check Remote Site Settings includes your backend domain
- In Salesforce: Setup → Apex Jobs → check for errors in the async queue

### "No module found" errors in backend
- Run `npm install` in the backend directory

### Database connection fails
- Verify DATABASE_URL in .env includes `?sslmode=require` for Railway Postgres
- Example: `postgresql://user:pass@host:5432/db?sslmode=require`
