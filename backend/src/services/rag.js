const pool = require('../db/pool');

/**
 * Retrieve the top-k most relevant knowledge base articles for a given case.
 *
 * NOTE: In production this should use real vector embeddings.
 * This implementation uses a keyword-based fallback so the project works
 * out of the box without an embedding API setup.
 *
 * To add real vector search:
 *   1. Generate embeddings for KB articles during seed (Claude or OpenAI)
 *   2. Generate embedding for the query
 *   3. Use the cosine similarity query below
 */
async function retrieveRelevantArticles({ subject, description, category }, topK = 3) {
  try {
    // Primary: category-based retrieval + keyword relevance
    const query = `${subject || ''} ${description || ''}`.toLowerCase();

    const result = await pool.query(
      `SELECT id, title, content, category
       FROM knowledge_base
       WHERE category = $1
       ORDER BY (
         CASE
           WHEN LOWER(content) LIKE $2 THEN 3
           WHEN LOWER(title) LIKE $2 THEN 2
           ELSE 1
         END
       ) DESC
       LIMIT $3`,
      [category, `%${query.substring(0, 50)}%`, topK]
    );

    // If no category match, fall back to general articles
    if (result.rows.length === 0) {
      const fallback = await pool.query(
        `SELECT id, title, content, category FROM knowledge_base LIMIT $1`,
        [topK]
      );
      return fallback.rows;
    }

    return result.rows;
  } catch (err) {
    console.error('RAG retrieval error:', err.message);
    return []; // Degrade gracefully — draft will still work without KB context
  }
}

module.exports = { retrieveRelevantArticles };
