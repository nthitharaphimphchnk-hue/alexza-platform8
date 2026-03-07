# AI SEO Writer

Write SEO-optimized articles with target keywords.

## What it does

- **seo_article** – Creates an SEO-optimized article with keyword placement and structure.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/seo_article" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "topic": "Best practices for remote team management",
      "keyword": "remote team management",
      "secondaryKeywords": "distributed teams, async work, virtual collaboration"
    }
  }'
```
