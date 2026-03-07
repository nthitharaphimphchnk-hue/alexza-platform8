# AI Lead Extractor

Extract structured lead information from unstructured text (emails, forms, notes).

## What it does

- **extract_lead** – Extracts name, email, company, and interest from text.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/extract_lead" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "text": "Hi, I am John from Acme Corp. Interested in your enterprise plan. Reach me at john@acme.com"
    }
  }'
```
