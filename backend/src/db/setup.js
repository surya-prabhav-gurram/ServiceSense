require('dotenv').config();
const pool = require('./pool');

async function setup() {
  const client = await pool.connect();
  try {
    console.log('Setting up ServiceSense database...');

    // Enable pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    console.log('✓ pgvector extension enabled');

    // Knowledge base articles (RAG source)
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id          SERIAL PRIMARY KEY,
        title       TEXT NOT NULL,
        content     TEXT NOT NULL,
        category    TEXT NOT NULL,  -- billing | technical | general | complaint
        embedding   vector(1536),   -- OpenAI ada-002 or Claude-compatible
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Create ivfflat index for fast similarity search
    await client.query(`
      CREATE INDEX IF NOT EXISTS knowledge_base_embedding_idx
      ON knowledge_base USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('✓ knowledge_base table created');

    // Cases table — mirrors Salesforce Case data for the dashboard
    await client.query(`
      CREATE TABLE IF NOT EXISTS cases (
        id              TEXT PRIMARY KEY,   -- Salesforce Case ID
        subject         TEXT,
        description     TEXT,
        status          TEXT DEFAULT 'New',
        sentiment       TEXT,
        urgency         TEXT,
        category        TEXT,
        confidence      NUMERIC(5,2),
        draft           TEXT,
        reasoning       TEXT,
        needs_review    BOOLEAN DEFAULT FALSE,
        reviewer_notes  TEXT,
        resolved_at     TIMESTAMPTZ,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ cases table created');

    // Eval results table
    await client.query(`
      CREATE TABLE IF NOT EXISTS eval_results (
        id              SERIAL PRIMARY KEY,
        case_id         TEXT REFERENCES cases(id),
        prompt_version  TEXT NOT NULL,
        eval_type       TEXT NOT NULL,  -- classification | draft_quality
        score           NUMERIC(3,2),   -- 0.0 - 1.0
        reasoning       TEXT,
        metadata        JSONB,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    console.log('✓ eval_results table created');

    console.log('\n✅ Database setup complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

setup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
