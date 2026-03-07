# AI Document Summarizer

Summarize documents, meeting notes, and long-form content.

## What it does

- **summarize_document** – Summarizes long documents into concise summaries.
- **meeting_summary** – Extracts action items and decisions from meeting notes.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add both actions from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/summarize_document" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "document": "Full document text here...",
      "maxLength": "3 paragraphs"
    }
  }'
```
