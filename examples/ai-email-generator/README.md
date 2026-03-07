# AI Email Generator

Generate email campaigns, follow-ups, and personalized emails.

## What it does

- **email_campaign** – Creates email campaign copy with subject and body.
- **follow_up_email** – Generates personalized lead follow-up emails.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/email_campaign" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "purpose": "Product launch announcement",
      "audience": "Existing customers",
      "message": "New feature: AI-powered analytics"
    }
  }'
```
