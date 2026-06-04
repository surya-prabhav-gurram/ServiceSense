/**
 * CaseTrigger
 * Fires AFTER INSERT on new Cases.
 * Hands off to CaseAIHandler to enqueue AI classification + draft generation.
 */
trigger CaseTrigger on Case (after insert) {
    // Collect IDs of newly created cases
    List<Id> newCaseIds = new List<Id>();
    for (Case c : Trigger.new) {
        newCaseIds.add(c.Id);
    }

    // Enqueue async job so we don't block the DML transaction
    // and can make HTTP callouts (not allowed in synchronous triggers)
    System.enqueueJob(new CaseAIHandler(newCaseIds));
}
