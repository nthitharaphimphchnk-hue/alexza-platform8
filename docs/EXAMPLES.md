# ALEXZA AI Example Projects

Ready-to-use example projects demonstrating how to build AI APIs, agents, and automations.

## Overview

The [Examples Library](/examples) provides 18 example projects you can import into ALEXZA. Each example includes:

- **README.md** – What it does, how to import, example curl
- **actions.json** – Action definitions (prompt, input schema)
- **workflow.json** – Optional workflow blueprint (for automation examples)
- **agent.json** – Optional agent spec (for agent examples)

## Example Projects

| Example | Actions | Workflow | Agent |
|---------|---------|----------|-------|
| [ai-blog-api](/examples/ai-blog-api) | generate_blog | — | — |
| [ai-support-agent](/examples/ai-support-agent) | support_response, triage_ticket | — | ✓ |
| [ai-lead-extractor](/examples/ai-lead-extractor) | extract_lead | ✓ | — |
| [ai-email-generator](/examples/ai-email-generator) | email_campaign, follow_up_email | ✓ | — |
| [ai-research-agent](/examples/ai-research-agent) | synthesize_research, research_outline | — | ✓ |
| [ai-seo-writer](/examples/ai-seo-writer) | seo_article | — | — |
| [ai-document-summarizer](/examples/ai-document-summarizer) | summarize_document, meeting_summary | — | — |
| [ai-product-description](/examples/ai-product-description) | product_description | — | — |
| [ai-sales-agent](/examples/ai-sales-agent) | sales_pitch, objection_handler | — | ✓ |
| [ai-customer-support-bot](/examples/ai-customer-support-bot) | triage_ticket, draft_response | — | ✓ |
| [ai-headline-generator](/examples/ai-headline-generator) | generate_headlines | — | — |
| [ai-meeting-summarizer](/examples/ai-meeting-summarizer) | meeting_to_actions | — | — |
| [ai-resume-parser](/examples/ai-resume-parser) | parse_resume | — | — |
| [ai-contact-extractor](/examples/ai-contact-extractor) | extract_contacts | — | — |
| [ai-faq-generator](/examples/ai-faq-generator) | generate_faq | — | — |
| [ai-cold-email](/examples/ai-cold-email) | cold_email | — | — |
| [ai-transcript-summarizer](/examples/ai-transcript-summarizer) | summarize_transcript | — | — |
| [ai-proposal-writer](/examples/ai-proposal-writer) | write_proposal | — | — |

## How to Install Examples into Projects

### 1. Import Actions

**Via Dashboard:**

1. Open your project in the ALEXZA Dashboard.
2. For each action in the example's `actions.json`:
   - Click **Add Action**
   - Set **Action name** = `actionName` from JSON
   - Set **Prompt** = `promptTemplate` from JSON
   - Set **Input schema** = `inputSchema` from JSON (as JSON object)
   - Save

**Via API:**

```bash
# For each action in actions.json, POST to create
curl -X POST "https://api.alexza.ai/api/projects/YOUR_PROJECT_ID/actions" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "actionName": "generate_blog",
    "description": "Generate a full blog post...",
    "promptTemplate": "Write a comprehensive blog post...",
    "inputSchema": { "type": "object", "properties": {...}, "required": [...] }
  }'
```

### 2. Create Workflows (if workflow.json exists)

1. Go to **Workflows** in the Dashboard.
2. Create a new workflow.
3. Add steps per the `workflow.json` blueprint:
   - **Trigger** – webhook, api_event, or schedule
   - **Action** – run_ai_action with your project ID and action name
   - **Output** – log_result or send_webhook
4. Replace `YOUR_PROJECT_ID` with your actual project ID.

### 3. Create Agents (if agent.json exists)

1. Go to **Agents** in the Dashboard.
2. Create a new agent.
3. Set name and description from `agent.json`.
4. Add tools: for each tool, select your project and the corresponding action.
5. Enable memory if `memoryEnabled` is true.

## Running Actions via API

After importing, run any action:

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/ACTION_NAME" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"input": {"key": "value"}}'
```

- **YOUR_PROJECT_ID** – Your project's MongoDB ObjectId
- **ACTION_NAME** – Action name (e.g. `generate_blog`, `extract_lead`)
- **YOUR_API_KEY** – Project API key with `run:actions` scope
- **input** – Object matching the action's `inputSchema` properties

### Example: Blog Generator

```bash
curl -X POST "https://api.alexza.ai/v1/projects/507f1f77bcf86cd799439011/run/generate_blog" \
  -H "Content-Type: application/json" \
  -H "x-api-key: axza_live_..." \
  -d '{
    "input": {
      "topic": "The Future of Remote Work",
      "keyPoints": "hybrid models, async communication"
    }
  }'
```

## Import Script (Optional)

To bulk-import actions from an example folder, you can use a script that reads `actions.json` and calls the create-action API for each entry. See the [examples README](/examples) for a sample script structure.
