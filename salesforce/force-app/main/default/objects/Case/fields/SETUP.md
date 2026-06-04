# Custom Fields Setup

These custom fields must be added to the **Case** object in your Salesforce org before deploying the Apex.

## Option A: Deploy via metadata (recommended)

The field metadata files in `objects/Case/fields/` are included in this project.
Run: `sf project deploy start --target-org ServiceSense`

## Option B: Create manually in Setup

Go to: Setup → Object Manager → Case → Fields & Relationships → New

| Field Label       | API Name              | Type          | Length |
|-------------------|-----------------------|---------------|--------|
| AI Sentiment      | AI_Sentiment__c       | Text          | 50     |
| AI Urgency        | AI_Urgency__c         | Text          | 50     |
| AI Category       | AI_Category__c        | Text          | 50     |
| AI Confidence     | AI_Confidence__c      | Number        | 5,2    |
| AI Draft          | AI_Draft__c           | Long Text Area | 32768 |
| AI Reasoning      | AI_Reasoning__c       | Long Text Area | 32768 |
| AI Needs Review   | AI_Needs_Review__c    | Checkbox      | —      |
