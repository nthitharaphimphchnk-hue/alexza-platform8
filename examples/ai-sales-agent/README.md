# AI Sales Agent

Sales outreach, objection handling, and pitch generation.

## What it does

- **sales_pitch** – Generates a sales pitch for a product and prospect.
- **objection_handler** – Drafts responses to common sales objections.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/sales_pitch" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "product": "Enterprise CRM",
      "prospect": "VP Sales at mid-size SaaS company",
      "painPoints": "Manual data entry, poor visibility"
    }
  }'
```
