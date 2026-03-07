# AI Proposal Writer

Generate business proposals and project outlines.

## What it does

- **write_proposal** – Creates a structured business proposal from requirements.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/write_proposal" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "client": "Acme Corp",
      "project": "Website redesign and CMS migration",
      "scope": "Design, development, content migration, 3-month timeline"
    }
  }'
```
