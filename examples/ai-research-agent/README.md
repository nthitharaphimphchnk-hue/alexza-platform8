# AI Research Agent

Synthesize research findings and generate research summaries.

## What it does

- **synthesize_research** – Combines multiple sources into a coherent research summary.
- **research_outline** – Creates a research outline from a topic.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/synthesize_research" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "topic": "Impact of AI on healthcare",
      "sources": "Source 1: AI reduces diagnostic errors by 40%. Source 2: Patient satisfaction improved with AI triage."
    }
  }'
```
