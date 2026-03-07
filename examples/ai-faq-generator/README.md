# AI FAQ Generator

Generate FAQs from product or service information.

## What it does

- **generate_faq** – Creates FAQ questions and answers from product/service info.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/generate_faq" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "productInfo": "SaaS platform for project management. Free tier: 3 projects. Pro: unlimited. Enterprise: SSO, audit logs.",
      "count": "5"
    }
  }'
```
