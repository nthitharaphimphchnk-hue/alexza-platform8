# AI Contact Extractor

Extract contact information (name, email, phone) from unstructured text.

## What it does

- **extract_contacts** – Extracts name, email, and phone from text.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/extract_contacts" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "text": "Contact: Sarah Chen, sarah.chen@company.com, +1-555-123-4567"
    }
  }'
```
