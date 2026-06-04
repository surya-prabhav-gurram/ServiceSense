require('dotenv').config();
const pool = require('./pool');

// Knowledge base articles — these power the RAG draft generation
// In production: ingest from your actual help docs / Confluence / Notion
const articles = [
  {
    title: 'Billing Dispute Resolution Process',
    category: 'billing',
    content: `When a customer reports an incorrect charge, follow these steps:
1. Verify the charge in the billing system using the customer's account ID.
2. If the charge is confirmed incorrect, issue a credit within 1-2 business days.
3. Send the customer a confirmation email with the credit details and expected timeline.
4. If the charge is correct but customer disputes it, provide a detailed breakdown of charges.
5. For recurring incorrect charges, escalate to the billing engineering team.
Common billing issues: duplicate charges, wrong plan pricing, promotional discount not applied, trial period not honored.`
  },
  {
    title: 'Password Reset and Account Access Issues',
    category: 'technical',
    content: `Steps to help customers regain account access:
1. Direct customer to the password reset page at /forgot-password.
2. If email is not received within 5 minutes, check spam/junk folders.
3. For accounts locked after multiple failed attempts, the lock expires after 30 minutes.
4. If the customer no longer has access to their email, identity verification is required.
5. Verified customers can update their email via a support ticket with ID proof.
Two-factor authentication issues: customer can use backup codes, or contact support for 2FA reset after identity verification.`
  },
  {
    title: 'Service Outage and Performance Issues',
    category: 'technical',
    content: `When customers report service unavailability or slowness:
1. Check the status page at status.company.com for any active incidents.
2. If an outage is confirmed, acknowledge and provide the incident link.
3. For isolated performance issues, collect: browser, OS, network type, steps to reproduce.
4. Guide customer through basic troubleshooting: clear cache, try incognito, check internet connection.
5. If issue persists, escalate to the technical support team with the diagnostic information.
Response template for confirmed outage: "We're aware of an issue affecting [feature] and our team is actively working on a fix. Updates at status.company.com."`
  },
  {
    title: 'Subscription Upgrade and Downgrade',
    category: 'billing',
    content: `Plan change requests:
1. Upgrades take effect immediately; customer is charged a prorated amount.
2. Downgrades take effect at the next billing cycle.
3. If a customer wants to downgrade due to cost, offer the option to pause the subscription instead.
4. Annual plan customers: upgrades prorate the annual cost; downgrades issue a credit to the account.
5. Enterprise plan changes require approval from the account manager.
If customer is unhappy with pricing, escalate to the retention team before processing any downgrade.`
  },
  {
    title: 'Feature Request and Product Feedback',
    category: 'general',
    content: `Handling feature requests:
1. Thank the customer for the feedback — it drives the product roadmap.
2. Log the request in the product feedback tracker with the customer's use case.
3. If the feature is on the roadmap, provide a general timeline without committing to specific dates.
4. If the feature is not planned, acknowledge the request and explain the current focus areas.
5. Offer workarounds if available.
Do not promise specific release dates for unreleased features.`
  },
  {
    title: 'Complaint Escalation Process',
    category: 'complaint',
    content: `For customers who express strong dissatisfaction:
1. Acknowledge the customer's experience — do not be defensive.
2. Apologize for the inconvenience, regardless of fault.
3. Clearly state what corrective action will be taken and by when.
4. If the issue involves service failure on our part, offer a service credit.
5. Escalate to a senior agent if the customer is asking to speak with a manager.
Escalation triggers: mention of legal action, media threats, repeated unresolved issues, VIP account. 
Key phrase to use: "I completely understand your frustration, and I want to make this right for you."`
  },
  {
    title: 'Data Export and Account Deletion',
    category: 'general',
    content: `Data portability and deletion requests (GDPR/CCPA compliance):
1. Data export requests: process within 30 days; send a download link via email.
2. Account deletion: inform customer that deletion is permanent and data cannot be recovered.
3. Before deleting, ensure any active subscriptions are cancelled to avoid future charges.
4. Confirm deletion request via email with a 7-day cooling-off period.
5. Log all deletion requests in the compliance tracker.
If the customer is in an annual contract, deletion may not be possible until contract end — consult Legal.`
  },
  {
    title: 'Integration and API Support',
    category: 'technical',
    content: `Helping customers with API and integration issues:
1. Direct customers to the API documentation at docs.company.com/api.
2. For authentication errors (401): verify API key is correct and not expired; check rate limits.
3. For 429 rate limit errors: explain the limits and suggest implementing exponential backoff.
4. Webhook failures: check endpoint URL, verify SSL certificate, inspect logs in the developer dashboard.
5. For complex integration questions, escalate to the developer support team.
Common issues: incorrect base URL, missing authentication header, webhook IP not allowlisted.`
  }
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding knowledge base...');

    // Note: embeddings are stored as random placeholders here.
    // In production, generate real embeddings using Claude or OpenAI:
    //   const embedding = await generateEmbedding(article.content);
    // For now, the RAG service uses keyword matching as a fallback.

    for (const article of articles) {
      // Generate a placeholder 1536-dim zero vector
      // Replace with real embeddings in production
      const placeholderEmbedding = new Array(1536).fill(0);

      await client.query(
        `INSERT INTO knowledge_base (title, content, category, embedding)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [article.title, article.content, article.category,
         JSON.stringify(placeholderEmbedding)]
      );
      console.log(`✓ Seeded: ${article.title}`);
    }

    console.log(`\n✅ Seeded ${articles.length} knowledge base articles.`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
