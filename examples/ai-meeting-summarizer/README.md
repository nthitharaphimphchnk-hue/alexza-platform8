# AI Meeting Summarizer

Convert meeting notes into action items and decisions.

## What it does

- **meeting_to_actions** – Extracts action items, decisions, and owners from meeting notes.

## How to import into ALEXZA

1. Create a project in the ALEXZA Dashboard.
2. Add the action from `actions.json`.
3. Create an API key with `run:actions` scope.

## Example curl request

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/meeting_to_actions" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "input": {
      "notes": "Q1 Planning - Jan 15. Attendees: Alice, Bob, Carol. Decisions: Launch in March. Alice to finalize pricing. Bob to update docs by Feb 1."
    }
  }'
```
