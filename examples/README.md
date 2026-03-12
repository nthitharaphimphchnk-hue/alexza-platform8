# ALEXZA AI Example Projects

Ready-to-use example projects demonstrating how to build AI APIs, agents, and automations using ALEXZA.

## Quick Start

1. **Create a project** in the [ALEXZA Dashboard](https://app.alexza.ai) (or your self-hosted instance).
2. **Import an example** by creating actions from the `actions.json` files (see each example's README).
3. **Run via API** using `POST /v1/projects/:projectId/run/:actionName` with your API key.

## Example Projects

| Example | Description |
|---------|-------------|
| [ai-blog-api](./ai-blog-api) | Generate full blog posts from topics and key points |
| [ai-blog-generator](./ai-blog-generator) | Generate full blog posts from topic and key points (`example.json`) |
| [ai-email-writer](./ai-email-writer) | Generate professional emails from brief and recipient (`example.json`) |
| [ai-support-agent](./ai-support-agent) | Customer support response generator |
| [ai-lead-extractor](./ai-lead-extractor) | Extract lead info from unstructured text |
| [ai-email-generator](./ai-email-generator) | Generate email campaigns and follow-ups |
| [ai-research-agent](./ai-research-agent) | Synthesize research findings |
| [ai-seo-writer](./ai-seo-writer) | SEO-optimized article writer |
| [ai-document-summarizer](./ai-document-summarizer) | Summarize documents and meeting notes |
| [ai-product-description](./ai-product-description) | E-commerce product descriptions |
| [ai-sales-agent](./ai-sales-agent) | Sales outreach and objection handling |
| [ai-customer-support-bot](./ai-customer-support-bot) | Support ticket triage and response draft |
| [ai-headline-generator](./ai-headline-generator) | Generate catchy headlines |
| [ai-meeting-summarizer](./ai-meeting-summarizer) | Meeting notes to action items |
| [ai-resume-parser](./ai-resume-parser) | Extract structured data from resumes |
| [ai-contact-extractor](./ai-contact-extractor) | Extract contact info from text |
| [ai-faq-generator](./ai-faq-generator) | Generate FAQs from product info |
| [ai-cold-email](./ai-cold-email) | Cold outreach email writer |
| [ai-transcript-summarizer](./ai-transcript-summarizer) | Summarize transcripts and calls |
| [ai-proposal-writer](./ai-proposal-writer) | Business proposal writer |

## How to Import

Each example includes `actions.json` or `example.json` with action definitions. To import:

### Option 1: Via Dashboard (Recommended)

1. Open your project in the ALEXZA Dashboard.
2. For each action in `actions.json` or `example.json`, click **Add Action** and paste:
   - **Action name** → `actionName`
   - **Description** → `description`
   - **Prompt** → `promptTemplate`
   - **Input schema** → `inputSchema`
3. Save each action.

### Option 2: Via API

Use `POST /api/projects/:projectId/actions` (authenticated) with each action from `actions.json`:

```bash
curl -X POST "https://api.alexza.ai/api/projects/YOUR_PROJECT_ID/actions" \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d @actions.json
```

### Option 3: Import Script

Use the provided import script (see [docs/EXAMPLES.md](../docs/EXAMPLES.md)) to bulk-import from an example folder.

## Running Actions

After importing, run any action via the Runtime API:

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/ACTION_NAME" \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"input": {"topic": "AI in healthcare", "keyPoints": "diagnostics, automation"}}'
```

Replace:
- `YOUR_PROJECT_ID` – Your project's MongoDB ObjectId
- `ACTION_NAME` – The action name (e.g. `generate_blog`)
- `YOUR_API_KEY` – Project API key with `run:actions` scope
- `input` – Object matching the action's `inputSchema`

## Workflows & Agents

Some examples include `workflow.json` or `agent.json` for advanced use cases:

- **workflow.json** – Defines workflow steps (triggers, run_ai_action, outputs). Create via Dashboard → Workflows.
- **agent.json** – Defines an AI agent with tools. Create via Dashboard → Agents.

See each example's README for details.
