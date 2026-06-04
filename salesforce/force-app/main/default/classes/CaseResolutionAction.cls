/**
 * CaseResolutionAction
 * @InvocableMethod so Agentforce / Flow can call this action directly.
 * Accepts a resolution decision (approve/reject) and applies it to the Case:
 *   - Approve: pushes draft as a Case Comment / Email, marks case resolved
 *   - Reject:  clears draft, flags for manual handling
 */
public class CaseResolutionAction {

    @InvocableMethod(
        label='Apply AI Resolution Decision'
        description='Approve or reject an AI-drafted Case response. Approve sends the draft; Reject flags for manual handling.'
        category='ServiceSense'
    )
    public static List<ResolutionResult> applyResolution(List<ResolutionRequest> requests) {
        List<ResolutionResult> results = new List<ResolutionResult>();

        for (ResolutionRequest req : requests) {
            ResolutionResult result = new ResolutionResult();
            try {
                result = processResolution(req);
            } catch (Exception e) {
                result.success      = false;
                result.errorMessage = e.getMessage();
            }
            results.add(result);
        }
        return results;
    }

    private static ResolutionResult processResolution(ResolutionRequest req) {
        ResolutionResult result = new ResolutionResult();

        // Fetch the case
        Case c = [
            SELECT Id, AI_Draft__c, AI_Needs_Review__c, Status, ContactId
            FROM Case
            WHERE Id = :req.caseId
            LIMIT 1
        ];

        if (req.decision == 'approve') {
            // Post draft as a Case Comment visible to the customer
            CaseComment cc = new CaseComment(
                ParentId    = c.Id,
                CommentBody = req.finalResponse != null ? req.finalResponse : c.AI_Draft__c,
                IsPublished = true
            );
            insert cc;

            // Update Case status
            c.Status             = 'Resolved';
            c.AI_Needs_Review__c = false;
            update c;

            result.success    = true;
            result.caseStatus = 'Resolved';
            result.message    = 'Draft approved and posted as Case Comment';

        } else if (req.decision == 'reject') {
            // Clear draft, flag for manual handling
            c.AI_Draft__c        = null;
            c.AI_Needs_Review__c = true;
            c.Status             = 'Open';
            update c;

            result.success    = true;
            result.caseStatus = 'Open';
            result.message    = 'Draft rejected. Case returned to queue for manual handling.';

        } else {
            throw new IllegalArgumentException('Invalid decision: ' + req.decision + '. Must be approve or reject.');
        }

        return result;
    }

    // ─── Input / Output classes ────────────────────────────────────────────

    public class ResolutionRequest {
        @InvocableVariable(
            label='Case ID'
            description='Salesforce Case record ID'
            required=true
        )
        public Id caseId;

        @InvocableVariable(
            label='Decision'
            description='approve or reject'
            required=true
        )
        public String decision;

        @InvocableVariable(
            label='Final Response'
            description='Optional edited response text. If blank, original AI draft is used.'
        )
        public String finalResponse;

        @InvocableVariable(
            label='Reviewer Notes'
            description='Internal notes from the human reviewer'
        )
        public String reviewerNotes;
    }

    public class ResolutionResult {
        @InvocableVariable(label='Success')
        public Boolean success;

        @InvocableVariable(label='Case Status')
        public String caseStatus;

        @InvocableVariable(label='Message')
        public String message;

        @InvocableVariable(label='Error Message')
        public String errorMessage;
    }
}
