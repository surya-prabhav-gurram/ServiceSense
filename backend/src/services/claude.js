const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Run a single Claude completion.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxTokens
 * @returns {Promise<string>}
 */
async function complete(systemPrompt, userMessage, maxTokens = 1024) {
  const msg = await client.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system:     systemPrompt,
    messages:   [{ role: 'user', content: userMessage }],
  });
  return msg.content[0].text;
}

/**
 * Run a Claude completion and parse the response as JSON.
 * Strips markdown fences if present.
 * @param {string} systemPrompt
 * @param {string} userMessage
 * @param {number} maxTokens
 * @returns {Promise<object>}
 */
async function completeJSON(systemPrompt, userMessage, maxTokens = 1024) {
  const text = await complete(systemPrompt, userMessage, maxTokens);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}

module.exports = { complete, completeJSON };
