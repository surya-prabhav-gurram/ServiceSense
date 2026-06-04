const express = require('express');
const router  = express.Router();
const { complete } = require('../services/claude');
const { SYSTEM_PROMPT, buildUserMessage, VERSION } = require('../prompts/draft');
const { retrieveRelevantArticles } = require('../services/rag');
const pool = require('../db/pool');

/**
 * POST /api/draft
 * Called by Salesforce CaseAIHandler after classification.
 * Body: { caseId, subject, description, category, sentiment, urgency }
 * Returns: { draft, knowledgeArticlesUsed, promptVersion }
 */
router.post('/', async (req, res) => {
  const { caseId, subject, description, category, sentiment, urgency } = req.body;

  try {
    // Retrieve relevant KB articles (RAG)
    const knowledgeArticles = await retrieveRelevantArticles({ subject, description, category });

    // Generate draft
    const userMessage = buildUserMessage({
      caseData: { subject, description },
      classification: { sentiment, urgency, category },
      knowledgeArticles
    });

    const draft = await complete(SYSTEM_PROMPT, userMessage, 512);

    // Update case record with draft
    if (caseId) {
      await pool.query(
        `UPDATE cases SET draft = $1, updated_at = NOW() WHERE id = $2`,
        [draft, caseId]
      );
    }

    res.json({
      draft,
      knowledgeArticlesUsed: knowledgeArticles.map(a => a.title),
      promptVersion: VERSION
    });
  } catch (err) {
    console.error('Draft generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
