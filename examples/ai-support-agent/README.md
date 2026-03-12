# AI Support Agent

Draft support responses and triage tickets using ALEXZA.

## Actions

- **support_response** – Drafts an empathetic, solution-focused support reply.
- **triage_ticket** – Classifies a ticket by urgency and category.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add actions with the contents of `example.json` (action names, prompts, input schemas).
3. Create an API key with `run:actions` scope.

## How to call the API

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

### Example: `support_response`

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/support_response" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "customerMessage": "My order #12345 has not arrived after 2 weeks.",
      "context": "Customer is a premium subscriber, order shipped 14 days ago."
    }
  }'
```

### Example: `triage_ticket`

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/triage_ticket" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "ticket": "URGENT: Payment failed but my card was charged. Need refund ASAP."
    }
  }'
```

Replace `YOUR_PROJECT_ID` with your project id and `YOUR_API_KEY` with a key that has `run:actions` scope.
# AI Support Agent

Draft support responses and triage tickets using ALEXZA.

## Actions

- **support_response** – Drafts an empathetic, solution-focused support reply.
- **triage_ticket** – Classifies a ticket by urgency and category.

## How to import

1. Create a project in the ALEXZA Dashboard.
2. Add actions using the contents of `example.json`.
3. Create an API key with `run:actions` scope.

## API Call

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

### support_response

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/support_response" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "customerMessage": "My order #12345 has not arrived after 2 weeks",
      "context": "Customer is a premium subscriber, order shipped 14 days ago"
    }
  }'
```

### triage_ticket

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/triage_ticket" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "ticket": "URGENT: Payment failed but I was charged. Need refund ASAP."
    }
  }'
```

Replace `YOUR_PROJECT_ID` and `YOUR_API_KEY` with your values.
