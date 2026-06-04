const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');

/**
 * GET /api/cases
 * Returns all cases for the dashboard feed, newest first.
 * Optional query params: ?status=Resolved&category=billing&limit=50
 */
router.get('/', async (req, res) => {
  const { status, category, limit = 50 } = req.query;

  let conditions = [];
  let params     = [];

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }

  params.push(Math.min(parseInt(limit), 200));

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  try {
    const result = await pool.query(
      `SELECT id, subject, description, status, sentiment, urgency, category,
              confidence, needs_review, created_at, updated_at
       FROM cases ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length}`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cases/:id
 * Returns full case detail including draft.
 */
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM cases WHERE id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Case not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/cases/stats/summary
 * Returns aggregate counts for dashboard header cards.
 */
router.get('/stats/summary', async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*)                                              AS total,
         COUNT(*) FILTER (WHERE needs_review = TRUE)          AS pending_review,
         COUNT(*) FILTER (WHERE status = 'Resolved')          AS resolved,
         COUNT(*) FILTER (WHERE urgency IN ('critical','high')) AS high_priority,
         ROUND(AVG(confidence)::numeric * 100, 1)             AS avg_confidence_pct
       FROM cases`
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
