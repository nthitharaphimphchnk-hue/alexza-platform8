# AI Blog Generator

Generate full blog posts from a topic and key points using ALEXZA.

## Action

- **generate_blog** – Creates an 800–1200 word blog post with intro, sections, conclusion, and CTA.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add an action with the contents of `example.json` (action name, prompt, input schema).
3. Create an API key with `run:actions` scope.

## How to call the API

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

Example using `curl`:

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/generate_blog" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "topic": "The Future of Remote Work",
      "keyPoints": "hybrid models, async communication, work-life balance"
    }
  }'
```

Replace `YOUR_PROJECT_ID` with your project id and `YOUR_API_KEY` with a key that has `run:actions` scope.
# AI Blog Generator

Generate full blog posts from a topic and key points using ALEXZA.

## Action

- **generate_blog** – Creates an 800–1200 word blog post with intro, sections, conclusion, and CTA.

## How to import

1. Create a project in the ALEXZA Dashboard.
2. Add an action using the contents of `example.json`.
3. Create an API key with `run:actions` scope.

## API Call

**Endpoint:** `POST /v1/projects/:projectId/run/:actionName`

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/generate_blog" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "topic": "The Future of Remote Work",
      "keyPoints": "hybrid models, async communication, work-life balance"
    }
  }'
```

Replace `YOUR_PROJECT_ID` and `YOUR_API_KEY` with your values.
