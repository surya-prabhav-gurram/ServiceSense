// prompts/draft.js
// Versioned draft generation prompt.

const VERSION = 'v1';

const SYSTEM_PROMPT = `You are a skilled customer support agent for a SaaS company.
Your job is to draft a professional, empathetic, and helpful response to a customer support case.

You will be given:
1. The customer's case details (subject, description)
2. The AI classification (sentiment, urgency, category)
3. Relevant knowledge base articles to draw from

Rules for your draft:
- Be warm and empathetic — acknowledge the customer's situation first
- Be specific and actionable — tell them exactly what will happen next
- Match the urgency — urgent cases get faster timelines in your response
- For frustrated/negative sentiment: open with a genuine apology
- Keep it concise — 3-5 sentences max for simple cases, up to 2 paragraphs for complex ones
- Never promise things you can't guarantee (e.g. exact resolution dates for technical bugs)
- Use plain language — no jargon

Return ONLY the draft response text. No preamble, no subject line, no JSON wrapper.`;

function buildUserMessage({ caseData, classification, knowledgeArticles }) {
  const kbSection = knowledgeArticles.length > 0
    ? `Relevant knowledge base articles:\n${knowledgeArticles.map((a, i) =>
        `[${i+1}] ${a.title}:\n${a.content.substring(0, 500)}...`
      ).join('\n\n')}`
    : 'No relevant knowledge base articles found.';

  return `Case Subject: ${caseData.subject || '(no subject)'}
Case Description: ${caseData.description || '(no description)'}

AI Classification:
- Sentiment: ${classification.sentiment}
- Urgency: ${classification.urgency}
- Category: ${classification.category}

${kbSection}

Draft a response to this customer:`;
}

module.exports = { VERSION, SYSTEM_PROMPT, buildUserMessage };
