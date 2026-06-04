require('dotenv').config();
const { completeJSON } = require('../services/claude');
const { SYSTEM_PROMPT, buildUserMessage, VERSION } = require('../prompts/judge');
const pool = require('../db/pool');

// 15 eval cases covering all case types
const EVAL_CASES = [
  {
    id: 'eval_001',
    subject: 'Charged twice for same month',
    description: 'My credit card was charged $49 twice on March 1st. This is unacceptable.',
    sentiment: 'frustrated',
    urgency: 'high',
    category: 'billing',
    draft: 'I sincerely apologize for the duplicate charge — this should never happen. I\'ve reviewed your account and confirmed the duplicate, and I\'ve initiated a full refund of $49 which will appear within 3-5 business days. I\'m also adding a $10 credit to your account for the inconvenience.'
  },
  {
    id: 'eval_002',
    subject: 'Cannot login to my account',
    description: 'I\'ve been locked out for 2 hours. I have a demo with a client in 30 minutes.',
    sentiment: 'frustrated',
    urgency: 'critical',
    category: 'technical',
    draft: 'I completely understand how stressful this is with a client demo approaching. I\'ve immediately reset your account lock and sent a password reset link to your email. If you don\'t see it within 2 minutes, check your spam folder or reply here and I\'ll send it again directly.'
  },
  {
    id: 'eval_003',
    subject: 'How do I export my data?',
    description: 'I want to download all my data. How do I do this?',
    sentiment: 'neutral',
    urgency: 'low',
    category: 'general',
    draft: 'You can export all your data from Settings → Account → Data Export. Click "Request Export" and we\'ll email you a download link within 30 minutes. The export includes all your records in CSV and JSON formats. Let me know if you need any help with the process!'
  },
  {
    id: 'eval_004',
    subject: 'Your product is terrible and I want a refund',
    description: 'I\'ve been a customer for 2 years and the recent update broke everything I rely on. I\'m done.',
    sentiment: 'frustrated',
    urgency: 'high',
    category: 'complaint',
    draft: 'I\'m truly sorry to hear the recent update has disrupted your workflow — this is the last thing we want for a long-time customer like you. I\'d love the chance to make this right. Can you tell me specifically which features were affected? I\'ll escalate this directly to our product team today. And regardless of that outcome, I want to explore what we can do to make this up to you.'
  },
  {
    id: 'eval_005',
    subject: 'API returning 401 errors',
    description: 'Started getting 401 Unauthorized errors on all API calls this morning. Nothing changed on our end.',
    sentiment: 'negative',
    urgency: 'critical',
    category: 'technical',
    draft: 'I can help you resolve this quickly. A 401 on all calls typically means your API key has expired or been rotated. Please check Settings → API → Your Keys — if you see an expiry date in the past, generate a new key. If your key looks valid, I\'ll escalate this to our API team immediately for investigation.'
  },
  {
    id: 'eval_006',
    subject: 'Can I upgrade mid-month?',
    description: 'I want to upgrade from Basic to Pro plan. Will I be charged for the full month or prorated?',
    sentiment: 'neutral',
    urgency: 'low',
    category: 'billing',
    draft: 'Great news — upgrades are prorated! If you upgrade today, you\'ll be charged the difference between your current plan and Pro for the remaining days in your billing cycle. Your new Pro features activate immediately. You can upgrade from Settings → Plan → Upgrade.'
  },
  {
    id: 'eval_007',
    subject: 'Feature request: dark mode',
    description: 'Please add dark mode. My eyes hurt after long sessions. Many users want this.',
    sentiment: 'positive',
    urgency: 'low',
    category: 'general',
    draft: 'Thank you for this feedback — dark mode is one of our most requested features and I\'ve added your vote to our product board. I can\'t share a specific release date, but I can tell you it\'s on our roadmap. In the meantime, browser extensions like Dark Reader work well with our app as a workaround.'
  },
  {
    id: 'eval_008',
    subject: 'Webhook not firing',
    description: 'Set up a webhook to our endpoint but it never fires when events occur. Tested the endpoint — it works fine.',
    sentiment: 'neutral',
    urgency: 'medium',
    category: 'technical',
    draft: 'Let\'s get your webhook working. The most common causes are: (1) the webhook URL isn\'t allowlisted in your firewall settings, (2) there\'s an SSL certificate issue on your endpoint, or (3) the webhook is set to a different environment (staging vs production). Check the Webhook Logs in your developer dashboard — they show delivery attempts and error codes. Share what you see there and I\'ll help you pinpoint the issue.'
  },
  {
    id: 'eval_009',
    subject: 'Cancel my subscription',
    description: 'I want to cancel. Too expensive for a startup.',
    sentiment: 'negative',
    urgency: 'medium',
    category: 'billing',
    draft: 'I understand budget constraints are real for startups. Before I process the cancellation, I want to make sure you\'re aware of our Startup Plan — it\'s 60% off for companies under 2 years old with under $1M ARR. If that doesn\'t fit, I can also pause your account for up to 3 months at no charge. If you still want to cancel, I can absolutely help with that too — just let me know.'
  },
  {
    id: 'eval_010',
    subject: 'Data not syncing between devices',
    description: 'Changes I make on my laptop don\'t show up on my phone and vice versa. This has been happening for 3 days.',
    sentiment: 'negative',
    urgency: 'medium',
    category: 'technical',
    draft: 'I\'m sorry for the sync issues — this shouldn\'t be happening. First, try signing out and back in on both devices to force a full resync. If that doesn\'t work, clear the app cache on your phone (Settings → Apps → ServiceSense → Clear Cache). If sync issues continue after these steps, please reply and I\'ll escalate this to our engineering team with your account details.'
  },
  {
    id: 'eval_011',
    subject: 'Wrong plan shown on invoice',
    description: 'My invoice says Pro but I\'m on Basic. I hope I haven\'t been charged Pro prices.',
    sentiment: 'neutral',
    urgency: 'high',
    category: 'billing',
    draft: 'I\'ve checked your account and you\'ve been correctly billed at Basic plan rates — the invoice label was a display error on our end that we\'ve now fixed. Your billing is accurate and you have not been overcharged. I apologize for the confusion this caused, and a corrected invoice will be emailed to you within 24 hours.'
  },
  {
    id: 'eval_012',
    subject: 'Want to delete my account',
    description: 'Please delete all my data. GDPR request.',
    sentiment: 'neutral',
    urgency: 'medium',
    category: 'general',
    draft: 'I\'ll process your GDPR deletion request. You\'ll receive a confirmation email with a secure verification link within 1 hour — clicking it confirms your identity and starts the deletion process. All your data will be permanently deleted within 30 days, and you\'ll receive a final confirmation when complete. Please note: if you have an active subscription, it will be cancelled as part of this process.'
  },
  {
    id: 'eval_013',
    subject: 'App crashes on startup',
    description: 'The mobile app crashes immediately when I open it. iPhone 15 Pro, latest iOS.',
    sentiment: 'negative',
    urgency: 'high',
    category: 'technical',
    draft: 'I apologize for the crash — we\'re aware of an issue affecting iOS 17.4+ on iPhone 15 models and our team is actively working on a fix. In the meantime, a workaround is to delete and reinstall the app from the App Store, which resolves the issue for most users. Our engineering team is targeting a patch release within 48 hours. I\'ll email you when it\'s live.'
  },
  {
    id: 'eval_014',
    subject: 'How to add team members?',
    description: 'I upgraded to Team plan but can\'t figure out how to invite my colleagues.',
    sentiment: 'positive',
    urgency: 'low',
    category: 'general',
    draft: 'Welcome to the Team plan! To invite colleagues: go to Settings → Team → Invite Members, enter their email addresses, and select their role (Admin, Editor, or Viewer). They\'ll receive an email invitation immediately. You can manage up to 25 members on the Team plan. Let me know if you run into any issues!'
  },
  {
    id: 'eval_015',
    subject: 'Threatening legal action over data breach',
    description: 'I believe my account was compromised and my data was exposed. I will be contacting my attorney.',
    sentiment: 'frustrated',
    urgency: 'critical',
    category: 'complaint',
    draft: 'I take this report extremely seriously and I\'m escalating this to our Security team immediately. A security specialist will contact you directly within 2 hours to investigate your account. In the meantime, I\'ve taken precautionary steps to secure your account. I understand your concern completely — your data security is our highest priority, and we\'ll give you a full and transparent account of what happened.'
  }
];

async function runEvals() {
  console.log(`Running eval suite — ${EVAL_CASES.length} cases, prompt version ${VERSION}\n`);

  const scores = [];

  for (const evalCase of EVAL_CASES) {
    try {
      const userMessage = buildUserMessage({
        caseData:       { subject: evalCase.subject, description: evalCase.description },
        classification: { sentiment: evalCase.sentiment, category: evalCase.category },
        draft:          evalCase.draft
      });

      const result = await completeJSON(SYSTEM_PROMPT, userMessage);
      scores.push(result.overall);

      // Upsert case for FK reference
      await pool.query(
        `INSERT INTO cases (id, subject, description, sentiment, urgency, category, confidence, draft)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
        [evalCase.id, evalCase.subject, evalCase.description,
         evalCase.sentiment, evalCase.urgency, evalCase.category, 0.9, evalCase.draft]
      );

      // Store eval result
      await pool.query(
        `INSERT INTO eval_results (case_id, prompt_version, eval_type, score, reasoning, metadata)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [evalCase.id, VERSION, 'draft_quality', result.overall,
         result.reasoning, JSON.stringify(result)]
      );

      const bar = '█'.repeat(Math.round(result.overall * 10));
      console.log(`[${evalCase.id}] ${evalCase.category.padEnd(10)} score: ${result.overall.toFixed(2)} ${bar}`);
    } catch (err) {
      console.error(`[${evalCase.id}] ERROR: ${err.message}`);
    }
  }

  // Summary
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const min = Math.min(...scores);
  const max = Math.max(...scores);

  console.log(`\n─────────────────────────────────`);
  console.log(`Prompt Version: ${VERSION}`);
  console.log(`Cases Evaluated: ${scores.length}`);
  console.log(`Avg Score: ${avg.toFixed(3)}`);
  console.log(`Min Score: ${min.toFixed(3)}`);
  console.log(`Max Score: ${max.toFixed(3)}`);
  console.log(`─────────────────────────────────`);

  await pool.end();
}

runEvals().catch(err => {
  console.error('Eval runner failed:', err);
  process.exit(1);
});
