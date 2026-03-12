# ALEXZA AI Platform

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/AI_Automation-FF6B35?style=for-the-badge" alt="AI Automation" />
  <img src="https://img.shields.io/badge/API_Platform-00D9FF?style=for-the-badge" alt="API Platform" />
</p>

<p align="center">
  <strong>Run AI workflows with a single API call</strong>
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#example">Example</a> •
  <a href="#documentation">Documentation</a>
</p>

---

## Overview

**ALEXZA** is an AI automation platform that allows developers to run AI workflows using a simple API call. Build, deploy, and scale intelligent automation without managing infrastructure.

- **One API** — Run any AI action with a single REST request
- **No vendor lock-in** — Supports OpenAI, OpenRouter, and multiple models
- **Production-ready** — Webhooks, billing, rate limits, and audit logs built-in

---

## Features

- **AI Actions** — Define prompts and schemas, run via API
- **Workflows** — Chain actions, triggers (webhook, schedule), and outputs
- **Agents** — AI agents with tools (actions, workflows, webhooks)
- **Webhooks** — Real-time event delivery with signature verification
- **Usage Billing** — Credits, wallet, Stripe integration, billing ledger
- **Multi-Region** — Latency-aware routing, region-aware webhooks
- **Background Jobs** — BullMQ + Redis for async processing
- **Enterprise** — SAML SSO, audit logs, admin analytics

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Client    │────▶│  ALEXZA API      │────▶│  OpenAI /   │
│   (SDK)     │     │  (Express)       │     │  OpenRouter │
└─────────────┘     └────────┬─────────┘     └─────────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐   ┌──────────┐   ┌──────────┐
        │ MongoDB  │   │  Redis   │   │ Workers  │
        │ (data)   │   │ (queues) │   │ (BullMQ) │
        └──────────┘   └──────────┘   └──────────┘
```

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: React 19, Vite, Tailwind CSS
- **Database**: MongoDB
- **Queue**: BullMQ + Redis (optional)
- **AI**: OpenAI, OpenRouter (multi-model fallback)

---

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 10+
- MongoDB

### Install & Run

```bash
# Clone the repository
git clone https://github.com/nthitharaphimphchnk-hue/แพลตฟอร์มอเล็กซ์ซ่า.git
cd alexza-ai

# Install dependencies
pnpm install

# Set up environment (copy and edit)
cp .env.example .env.local

# Start development server (backend + frontend)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) for the app, or [http://localhost:3005/api/health](http://localhost:3005/api/health) for the API.

### Required Environment Variables

```bash
SESSION_SECRET="your_secret"
MONGODB_URI="mongodb://..."
MONGODB_DB="alexza"
OPENAI_API_KEY="sk-..."
OPENROUTER_API_KEY="sk-..."  # for execution gateway
```

See [docs](docs/) for full configuration.

---

## Example API Request

Run an AI action with a single POST request:

```http
POST /v1/projects/:projectId/run/:actionName
Content-Type: application/json
x-api-key: axza_your_api_key

{
  "input": {
    "text": "Summarize this long document..."
  }
}
```

### cURL Example

```bash
curl -X POST "https://api.alexza.ai/v1/projects/YOUR_PROJECT_ID/run/summarize_text" \
  -H "Content-Type: application/json" \
  -H "x-api-key: axza_your_api_key" \
  -d '{"input":{"text":"Your text to summarize"}}'
```

### Response

```json
{
  "ok": true,
  "requestId": "uuid",
  "output": "Summary of your text...",
  "creditsCharged": 5,
  "usage": { "tokens": 123 },
  "latencyMs": 1200
}
```

### JavaScript SDK

```javascript
import { Alexza } from "@alexza-ai/sdk";

const client = new Alexza("axza_your_api_key");
const result = await client.run({
  project: "YOUR_PROJECT_ID",
  action: "summarize_text",
  input: { text: "Your text to summarize" },
});

console.log(result.output);
```

---

## Documentation

| Resource | Link |
|----------|------|
| **API Docs** | [docs/](docs/) |
| **Examples** | [examples/](examples/) — 18 ready-to-use projects |
| **SDK** | [sdk/js/](sdk/js/) — JavaScript/TypeScript |
| **CLI** | [cli/](cli/) — Command-line tools |
| **Multi-Region** | [docs/MULTI_REGION.md](docs/MULTI_REGION.md) |
| **Background Jobs** | [docs/BACKGROUND_JOBS.md](docs/BACKGROUND_JOBS.md) |
| **Billing** | [docs/BILLING_LEDGER.md](docs/BILLING_LEDGER.md) |

---

## License

MIT © ALEXZA AI

---

<p align="center">
  <a href="https://github.com/nthitharaphimphchnk-hue/แพลตฟอร์มอเล็กซ์ซ่า">View on GitHub</a> •
  <a href="https://x.com/ALEXZAAIGateway">Follow on X</a>
</p>
