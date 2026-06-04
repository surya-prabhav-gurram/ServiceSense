/**
 * CaseAIHandlerTest
 * Unit tests for CaseAIHandler and CaseResolutionAction.
 * Uses mock HTTP callouts so tests run without a live backend.
 */
@isTest
private class CaseAIHandlerTest {

    // ─── Mock HTTP Response ────────────────────────────────────────────────

    private class MockClassifySuccess implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            if (req.getEndpoint().contains('/classify')) {
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'sentiment'  => 'negative',
                    'urgency'    => 'high',
                    'category'   => 'billing',
                    'confidence' => 0.92,
                    'reasoning'  => 'Customer mentions incorrect charge and is frustrated.'
                }));
            } else if (req.getEndpoint().contains('/draft')) {
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'draft' => 'Dear Customer, Thank you for reaching out. We have reviewed your billing concern and will process a correction within 2 business days.'
                }));
            }
            return res;
        }
    }

    private class MockLowConfidence implements HttpCalloutMock {
        public HttpResponse respond(HttpRequest req) {
            HttpResponse res = new HttpResponse();
            res.setStatusCode(200);
            if (req.getEndpoint().contains('/classify')) {
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'sentiment'  => 'neutral',
                    'urgency'    => 'low',
                    'category'   => 'general',
                    'confidence' => 0.45,
                    'reasoning'  => 'Message is ambiguous.'
                }));
            } else if (req.getEndpoint().contains('/draft')) {
                res.setBody(JSON.serialize(new Map<String, Object>{
                    'draft' => 'Thank you for contacting us. An agent will be in touch shortly.'
                }));
            }
            return res;
        }
    }

    // ─── Tests ────────────────────────────────────────────────────────────

    @isTest
    static void testHighConfidenceCase() {
        Test.setMock(HttpCalloutMock.class, new MockClassifySuccess());

        Case testCase = new Case(
            Subject     = 'Wrong charge on my account',
            Description = 'I was charged $99 but my plan is $49. Please fix this immediately.',
            Origin      = 'Web',
            Status      = 'New'
        );
        insert testCase;

        Test.startTest();
        CaseAIHandler handler = new CaseAIHandler(new List<Id>{ testCase.Id });
        System.enqueueJob(handler);
        Test.stopTest();

        Case updated = [SELECT Status, AI_Sentiment__c, AI_Urgency__c,
                               AI_Category__c, AI_Confidence__c, AI_Needs_Review__c
                        FROM Case WHERE Id = :testCase.Id];

        System.assertEquals('negative', updated.AI_Sentiment__c, 'Sentiment should be negative');
        System.assertEquals('billing',  updated.AI_Category__c,  'Category should be billing');
        System.assertEquals(0.92,       updated.AI_Confidence__c, 'Confidence should be 0.92');
        System.assertEquals(false,      updated.AI_Needs_Review__c, 'High confidence — no review needed');
    }

    @isTest
    static void testLowConfidenceFlagsHITL() {
        Test.setMock(HttpCalloutMock.class, new MockLowConfidence());

        Case testCase = new Case(
            Subject     = 'Hello',
            Description = 'I have a question.',
            Origin      = 'Web',
            Status      = 'New'
        );
        insert testCase;

        Test.startTest();
        System.enqueueJob(new CaseAIHandler(new List<Id>{ testCase.Id }));
        Test.stopTest();

        Case updated = [SELECT AI_Needs_Review__c, Status FROM Case WHERE Id = :testCase.Id];
        System.assertEquals(true,            updated.AI_Needs_Review__c, 'Low confidence — should flag for review');
        System.assertEquals('Pending Review', updated.Status,            'Status should be Pending Review');
    }

    @isTest
    static void testResolutionApprove() {
        Case testCase = new Case(
            Subject            = 'Test',
            Description        = 'Test',
            Status             = 'Pending Review',
            AI_Draft__c        = 'This is the AI draft response.',
            AI_Needs_Review__c = true
        );
        insert testCase;

        Test.startTest();
        CaseResolutionAction.ResolutionRequest req = new CaseResolutionAction.ResolutionRequest();
        req.caseId   = testCase.Id;
        req.decision = 'approve';

        List<CaseResolutionAction.ResolutionResult> results =
            CaseResolutionAction.applyResolution(new List<CaseResolutionAction.ResolutionRequest>{ req });
        Test.stopTest();

        System.assertEquals(true, results[0].success);
        System.assertEquals('Resolved', results[0].caseStatus);

        Case updated = [SELECT Status FROM Case WHERE Id = :testCase.Id];
        System.assertEquals('Resolved', updated.Status);
    }

    @isTest
    static void testResolutionReject() {
        Case testCase = new Case(
            Subject            = 'Test',
            Description        = 'Test',
            Status             = 'Pending Review',
            AI_Draft__c        = 'AI draft to be rejected.',
            AI_Needs_Review__c = true
        );
        insert testCase;

        Test.startTest();
        CaseResolutionAction.ResolutionRequest req = new CaseResolutionAction.ResolutionRequest();
        req.caseId   = testCase.Id;
        req.decision = 'reject';

        List<CaseResolutionAction.ResolutionResult> results =
            CaseResolutionAction.applyResolution(new List<CaseResolutionAction.ResolutionRequest>{ req });
        Test.stopTest();

        System.assertEquals(true, results[0].success);
        System.assertEquals('Open', results[0].caseStatus);

        Case updated = [SELECT Status, AI_Draft__c FROM Case WHERE Id = :testCase.Id];
        System.assertEquals('Open', updated.Status);
        System.assertEquals(null,   updated.AI_Draft__c, 'Draft should be cleared on reject');
    }
}
