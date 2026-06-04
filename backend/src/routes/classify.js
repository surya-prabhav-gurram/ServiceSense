const express = require('express');
const router  = express.Router();
const { completeJSON } = require('../services/claude');
const { SYSTEM_PROMPT, buildUserMessage, VERSION } = require('../prompts/classify');
const pool = require('../db/pool');

/**
 * POST /api/classify
 * Called by Salesforce CaseAIHandler Apex class.
 * Body: { caseId, subject, description, origin, type }
 * Returns: { sentiment, urgency, category, confidence, reasoning }
 */
router.post('/', async (req, res) => {
  const { caseId, subject, description, origin, type } = req.body;

  if (!subject && !description) {
    return res.status(400).json({ error: 'subject or description required' });
  }

  try {
    const userMessage = buildUserMessage({ subject, description, origin, type });
    const result = await completeJSON(SYSTEM_PROMPT, userMessage);

    // Upsert case record for dashboard tracking
    await pool.query(
      `INSERT INTO cases (id, subject, description, sentiment, urgency, category, confidence, reasoning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         sentiment = EXCLUDED.sentiment,
         urgency   = EXCLUDED.urgency,
         category  = EXCLUDED.category,
         confidence = EXCLUDED.confidence,
         reasoning = EXCLUDED.reasoning,
         updated_at = NOW()`,
      [caseId || `local_${Date.now()}`, subject, description,
       result.sentiment, result.urgency, result.category,
       result.confidence, result.reasoning]
    );

    res.json({
      ...result,
      promptVersion: VERSION,
      caseId
    });
  } catch (err) {
    console.error('Classification error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
