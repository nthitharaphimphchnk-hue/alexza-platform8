# AI Product Description

Generate compelling e-commerce product descriptions.

## What it does

- **product_description** – Creates benefit-focused product descriptions for e-commerce.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/product_description" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "name": "Wireless Noise-Canceling Headphones",
      "features": "40hr battery, Bluetooth 5.2, foldable design",
      "customer": "Professionals and commuters"
    }
  }'
```
