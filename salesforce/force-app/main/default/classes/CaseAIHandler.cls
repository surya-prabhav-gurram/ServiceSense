/**
 * CaseAIHandler
 * Queueable Apex class that:
 *   1. Fetches new Case details
 *   2. Calls the ServiceSense backend for AI classification (sentiment, urgency, category, confidence)
 *   3. Calls the backend for a RAG-powered draft response
 *   4. Updates the Case with classification data and draft
 *   5. Flags low-confidence cases for Human-in-the-Loop review
 *
 * Named Credential required: ServiceSenseBackend
 *   Setup → Named Credentials → New
 *   Name: ServiceSenseBackend
 *   URL: https://your-railway-app.railway.app
 */
public class CaseAIHandler implements Queueable, Database.AllowsCallouts {

    private List<Id> caseIds;

    // Confidence threshold below which we flag for human review
    private static final Decimal HITL_THRESHOLD = 0.70;

    public CaseAIHandler(List<Id> caseIds) {
        this.caseIds = caseIds;
    }

    public void execute(QueueableContext context) {
        // Query Case fields needed for classification
        List<Case> cases = [
            SELECT Id, Subject, Description, Status, Priority,
                   ContactId, AccountId, Origin, Type
            FROM Case
            WHERE Id IN :caseIds
        ];

        for (Case c : cases) {
            try {
                // Step 1: Classify the case
                ClassificationResult classification = classifyCase(c);

                // Step 2: Generate draft response via RAG
                String draftResponse = generateDraft(c, classification);

                // Step 3: Update Case with AI results
                updateCase(c, classification, draftResponse);

            } catch (Exception e) {
                // Log error and continue to next case
                System.debug(LoggingLevel.ERROR,
                    'CaseAIHandler error for Case ' + c.Id + ': ' + e.getMessage());
                flagCaseError(c.Id, e.getMessage());
            }
        }
    }

    /**
     * Calls /classify endpoint — returns sentiment, urgency, category, confidence
     */
    private ClassificationResult classifyCase(Case c) {
        // Build request payload
        Map<String, Object> payload = new Map<String, Object>{
            'caseId'      => c.Id,
            'subject'     => c.Subject,
            'description' => c.Description,
            'origin'      => c.Origin,
            'type'        => c.Type
        };

        String responseBody = makeCallout('/api/classify', JSON.serialize(payload));
        Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(responseBody);

        ClassificationResult cr = new ClassificationResult();
        cr.sentiment   = (String)  result.get('sentiment');
        cr.urgency     = (String)  result.get('urgency');
        cr.category    = (String)  result.get('category');
        cr.confidence  = Decimal.valueOf(String.valueOf(result.get('confidence')));
        cr.reasoning   = (String)  result.get('reasoning');
        return cr;
    }

    /**
     * Calls /draft endpoint — returns RAG-powered draft response
     */
    private String generateDraft(Case c, ClassificationResult classification) {
        Map<String, Object> payload = new Map<String, Object>{
            'caseId'      => c.Id,
            'subject'     => c.Subject,
            'description' => c.Description,
            'category'    => classification.category,
            'sentiment'   => classification.sentiment,
            'urgency'     => classification.urgency
        };

        String responseBody = makeCallout('/api/draft', JSON.serialize(payload));
        Map<String, Object> result = (Map<String, Object>) JSON.deserializeUntyped(responseBody);
        return (String) result.get('draft');
    }

    /**
     * Updates the Case record with AI classification results and draft
     */
    private void updateCase(Case c, ClassificationResult cr, String draft) {
        Case updateRecord = new Case(Id = c.Id);

        // Map urgency to Salesforce Priority field
        if (cr.urgency == 'critical')      { updateRecord.Priority = 'High'; }
        else if (cr.urgency == 'high')     { updateRecord.Priority = 'High'; }
        else if (cr.urgency == 'medium')   { updateRecord.Priority = 'Medium'; }
        else                               { updateRecord.Priority = 'Low'; }

        // Store AI outputs in custom fields (see CustomFields setup)
        updateRecord.AI_Sentiment__c   = cr.sentiment;
        updateRecord.AI_Urgency__c     = cr.urgency;
        updateRecord.AI_Category__c    = cr.category;
        updateRecord.AI_Confidence__c  = cr.confidence;
        updateRecord.AI_Draft__c       = draft;
        updateRecord.AI_Reasoning__c   = cr.reasoning;

        // Flag for HITL if confidence is below threshold
        if (cr.confidence < HITL_THRESHOLD) {
            updateRecord.AI_Needs_Review__c = true;
            updateRecord.Status = 'Pending Review';
        } else {
            updateRecord.AI_Needs_Review__c = false;
            updateRecord.Status = 'In Progress';
            // Auto-route to appropriate queue based on category
            updateRecord.OwnerId = getQueueId(cr.category);
        }

        update updateRecord;
    }

    /**
     * Flags a case as errored so it doesn't slip through silently
     */
    private void flagCaseError(Id caseId, String errorMsg) {
        Case updateRecord = new Case(
            Id                = caseId,
            AI_Needs_Review__c = true,
            AI_Reasoning__c   = 'AI Processing Error: ' + errorMsg,
            Status            = 'Pending Review'
        );
        update updateRecord;
    }

    /**
     * Generic HTTP callout to the ServiceSense backend
     * Uses Named Credential: ServiceSenseBackend
     */
    private String makeCallout(String endpoint, String body) {
        HttpRequest req = new HttpRequest();
        req.setEndpoint('callout:ServiceSenseBackend' + endpoint);
        req.setMethod('POST');
        req.setHeader('Content-Type', 'application/json');
        req.setTimeout(30000); // 30 seconds
        req.setBody(body);

        Http http = new Http();
        HttpResponse res = http.send(req);

        if (res.getStatusCode() != 200) {
            throw new CalloutException(
                'Backend returned ' + res.getStatusCode() + ': ' + res.getBody()
            );
        }
        return res.getBody();
    }

    /**
     * Maps AI category to a Salesforce Queue ID
     * Replace queue IDs with actual IDs from your org:
     *   Setup → Queues → Copy ID from URL
     */
    private Id getQueueId(String category) {
        // Replace these with real Queue IDs from your org
        Map<String, String> queueMap = new Map<String, String>{
            'billing'     => '00G000000000001',  // Billing Support Queue
            'technical'   => '00G000000000002',  // Technical Support Queue
            'general'     => '00G000000000003',  // General Support Queue
            'complaint'   => '00G000000000004'   // Escalations Queue
        };

        String queueId = queueMap.get(category?.toLowerCase());
        return queueId != null ? (Id) queueId : (Id) queueMap.get('general');
    }

    /**
     * Inner class to hold classification results
     */
    public class ClassificationResult {
        public String  sentiment;   // positive | neutral | negative | frustrated
        public String  urgency;     // critical | high | medium | low
        public String  category;    // billing | technical | general | complaint
        public Decimal confidence;  // 0.0 – 1.0
        public String  reasoning;   // LLM explanation
    }
}
