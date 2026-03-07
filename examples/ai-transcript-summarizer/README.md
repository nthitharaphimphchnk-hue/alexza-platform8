# AI Transcript Summarizer

Summarize call transcripts, podcasts, and video content.

## What it does

- **summarize_transcript** – Summarizes transcripts with key points and action items.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/summarize_transcript" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "transcript": "Speaker 1: Let me walk you through the Q4 results... Speaker 2: What about the churn rate?..."
    }
  }'
```
