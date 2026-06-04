const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

/**
 * GET /api/hitl/queue
 * Returns all cases needing human review, ordered by urgency.
 */
router.get('/queue', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, subject, description, sentiment, urgency, category,
              confidence, draft, reasoning, created_at
       FROM cases
       WHERE needs_review = TRUE AND status != 'Resolved'
       ORDER BY
         CASE urgency
           WHEN 'critical' THEN 1
           WHEN 'high'     THEN 2
           WHEN 'medium'   THEN 3
           ELSE 4
         END,
         created_at ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/hitl/decision
 * Human reviewer approves or rejects an AI draft.
 * Body: { caseId, decision: 'approve'|'reject', finalResponse?, reviewerNotes? }
 */
router.post('/decision', async (req, res) => {
  const { caseId, decision, finalResponse, reviewerNotes } = req.body;

  if (!caseId || !decision) {
    return res.status(400).json({ error: 'caseId and decision required' });
  }
  if (!['approve', 'reject'].includes(decision)) {
    return res.status(400).json({ error: 'decision must be approve or reject' });
  }

  try {
    const newStatus = decision === 'approve' ? 'Resolved' : 'Open';
    const resolvedAt = decision === 'approve' ? 'NOW()' : 'NULL';

    await pool.query(
      `UPDATE cases SET
         status         = $1,
         needs_review   = FALSE,
         reviewer_notes = $2,
         draft          = COALESCE($3, draft),
         resolved_at    = ${resolvedAt},
         updated_at     = NOW()
       WHERE id = $4`,
      [newStatus, reviewerNotes, finalResponse, caseId]
    );

    res.json({
      success:    true,
      caseId,
      decision,
      newStatus,
      message: decision === 'approve'
        ? 'Draft approved and case resolved.'
        : 'Draft rejected. Case returned to open queue.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
