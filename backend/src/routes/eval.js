const express = require('express');
const router  = express.Router();
const { completeJSON } = require('../services/claude');
const { SYSTEM_PROMPT, buildUserMessage, VERSION } = require('../prompts/judge');
const pool = require('../db/pool');

/**
 * POST /api/eval/score
 * Runs LLM-as-judge on a specific case's draft.
 * Body: { caseId }
 */
router.post('/score', async (req, res) => {
  const { caseId } = req.body;

  try {
    // Fetch case data
    const caseResult = await pool.query(
      `SELECT id, subject, description, sentiment, category, urgency, draft
       FROM cases WHERE id = $1`,
      [caseId]
    );

    if (caseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const c = caseResult.rows[0];
    if (!c.draft) {
      return res.status(400).json({ error: 'Case has no draft to evaluate' });
    }

    const userMessage = buildUserMessage({
      caseData:       { subject: c.subject, description: c.description },
      classification: { sentiment: c.sentiment, category: c.category },
      draft:          c.draft
    });

    const evalResult = await completeJSON(SYSTEM_PROMPT, userMessage);

    // Store eval result
    await pool.query(
      `INSERT INTO eval_results (case_id, prompt_version, eval_type, score, reasoning, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [caseId, VERSION, 'draft_quality', evalResult.overall,
       evalResult.reasoning, JSON.stringify(evalResult)]
    );

    res.json({ caseId, ...evalResult, promptVersion: VERSION });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/eval/scores
 * Returns aggregate scores by prompt version for the dashboard.
 */
router.get('/scores', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         prompt_version,
         eval_type,
         COUNT(*)::int                          AS total_evals,
         ROUND(AVG(score)::numeric, 3)          AS avg_score,
         ROUND(MIN(score)::numeric, 3)          AS min_score,
         ROUND(MAX(score)::numeric, 3)          AS max_score,
         ROUND(STDDEV(score)::numeric, 3)       AS score_stddev
       FROM eval_results
       GROUP BY prompt_version, eval_type
       ORDER BY prompt_version, eval_type`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/eval/recent
 * Returns the 20 most recent individual eval scores.
 */
router.get('/recent', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.id, e.case_id, e.prompt_version, e.score, e.reasoning,
              e.metadata, e.created_at,
              c.subject, c.category
       FROM eval_results e
       LEFT JOIN cases c ON c.id = e.case_id
       ORDER BY e.created_at DESC
       LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
