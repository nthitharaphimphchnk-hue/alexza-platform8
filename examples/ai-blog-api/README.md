# AI Blog API

Generate full blog posts from a topic and key points using ALEXZA.

## What it does

- **generate_blog** – Creates an 800–1200 word blog post with intro, sections, conclusion, and CTA.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add an action with the contents of `actions.json` (action name, prompt, input schema).
3. Create an API key with `run:actions` scope.

## Example curl request

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
