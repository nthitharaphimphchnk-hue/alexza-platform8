# AI Cold Email

Generate cold outreach emails for sales and prospecting.

## What it does

- **cold_email** – Creates personalized cold emails for outreach.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/cold_email" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "recipient": "VP Engineering at Acme Corp",
      "product": "DevOps automation platform",
      "hook": "Noticed their recent Series B and engineering blog"
    }
  }'
```
