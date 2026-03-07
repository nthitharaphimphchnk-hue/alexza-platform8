# AI Headline Generator

Generate catchy headlines for content, ads, and social media.

## What it does

- **generate_headlines** – Creates 5 compelling headlines in mixed styles.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/generate_headlines" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "topic": "10 productivity tips for remote workers",
      "audience": "Knowledge workers"
    }
  }'
```
