# AI Email Writer

Generate professional emails from a brief and recipient context using ALEXZA.

## Action

- **write_email** – Creates a professional email with a suggested subject line and body.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add an action with the contents of `example.json` (action name, prompt, input schema).
3. Create an API key with `run:actions` scope.

## How to call the API

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

Example using `curl`:

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/write_email" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "brief": "Request a meeting to discuss Q2 partnership opportunities",
      "recipient": "Sarah Chen, Head of Partnerships at Acme Corp",
      "tone": "formal"
    }
  }'
```

Replace `YOUR_PROJECT_ID` with your project id and `YOUR_API_KEY` with a key that has `run:actions` scope.
# AI Email Writer

Generate professional emails from a brief and recipient context using ALEXZA.

## Action

- **write_email** – Creates a professional email with subject line and body based on your brief.

## How to import

1. Create a project in the ALEXZA Dashboard.
2. Add an action using the contents of `example.json`.
3. Create an API key with `run:actions` scope.

## API Call

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/write_email" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "brief": "Request a meeting to discuss Q2 partnership opportunities",
      "recipient": "Sarah Chen, Head of Partnerships at Acme Corp",
      "tone": "formal"
    }
  }'
```

Replace `YOUR_PROJECT_ID` and `YOUR_API_KEY` with your values.
