# AI Customer Support Bot

Support ticket triage and response drafting for customer support teams.

## What it does

- **triage_ticket** – Classifies tickets by urgency and category.
- **draft_response** – Drafts a support response based on ticket and knowledge base.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/triage_ticket" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "ticket": "User cannot login. Getting 500 error on password reset page."
    }
  }'
```
