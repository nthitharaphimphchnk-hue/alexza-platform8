# AI Support Agent

Generate empathetic customer support responses and triage support tickets.

## What it does

- **support_response** – Drafts a support reply based on the customer message and context.
- **triage_ticket** – Classifies support tickets by urgency and category.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/support_response" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "customerMessage": "My order has not arrived after 2 weeks. Order #12345.",
      "context": "Premium customer, first complaint"
    }
  }'
```
