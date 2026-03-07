# ALEXZA AI Template Library

Action Templates let you add high-quality, pre-built AI Actions to your project in one click. The library includes 50–100 ready-to-use templates across content, marketing, data extraction, productivity, and agents.

## Overview

- **Templates library**: Browse at [Templates](/app/templates) or `/app/templates`.
- **Marketplace**: Browse community templates at [Marketplace](/app/marketplace) or `/app/marketplace`.
- **Categories**: Content, Marketing, Data Extraction, Productivity, Agents, plus Summarize, Translate, Extraction, Writing, Support.
- **Apply**: Select a template and a project to create a new Action with the template's prompt and schemas.

## How to Install Templates into Projects

### 1. Open the Templates page

From the sidebar, click **Templates** (or go to `/app/templates`).

### 2. Search and filter

- Use the search box to find templates by name, description, or tags.
- Use the category dropdown to filter by type (e.g. Content, Marketing, Data Extraction).

### 3. Apply a template

1. Click **Apply to Project** on a template card.
2. In the dialog, select the project where you want to add the Action.
3. Click **Apply**.
4. You'll be redirected to the project page. The new Action appears in the Actions list.

### 4. Use the Action

The created Action uses the template's:

- **Prompt template** – e.g. `Summarize the following text in 2-3 concise sentences...`
- **Input schema** – e.g. `{ text: string }`
- **Output schema** – if defined by the template

You can edit the Action in the project settings after applying.

## Template Categories

| Category        | Examples                                                                 |
|-----------------|---------------------------------------------------------------------------|
| Content         | Blog Generator, SEO Article Writer, FAQ Generator, How-To Guide          |
| Marketing       | Product Description, Email Campaign, Lead Follow-up, Ad Copy AIDA         |
| Data Extraction | Resume Parser, Contact Extractor, Invoice Parser, Key Entities            |
| Productivity    | Meeting Notes Summarizer, Email Draft, Task List, Document Summarizer     |
| Agents          | Research Agent, Customer Support Agent, Sales Assistant, Support Triage  |
| Summarize       | Short summary, Long summary, Meeting notes                              |
| Translate       | Thai ↔ English                                                           |
| Extraction      | Contact info, Named entities                                              |
| Writing         | AIDA ad copy, FAQ generator, Email draft, Rewrite                        |
| Support         | Ticket triage, Response draft                                             |

## Example Templates

| Template                    | Category        | Use Case                          |
|-----------------------------|-----------------|-----------------------------------|
| Blog Generator              | Content         | Full blog posts from topic        |
| SEO Article Writer          | Marketing       | SEO-optimized articles            |
| Product Description Generator | Marketing     | E-commerce product descriptions   |
| Email Campaign Writer       | Marketing       | Persuasive email campaigns        |
| Lead Follow-up Email       | Marketing       | Personalized lead follow-ups      |
| Meeting Notes Summarizer   | Productivity    | Action items and decisions        |
| Resume Parser              | Data Extraction | Structured resume data            |
| Contact Info Extractor     | Data Extraction | Name, email, phone from text      |
| Research Agent             | Agents          | Synthesize research findings      |
| Customer Support Agent     | Agents          | Empathetic support responses      |
| Sales Assistant Agent      | Agents          | Sales outreach and follow-ups     |

## Tags

Templates are tagged for search. Example tags:

- **seo** – SEO, meta, keywords
- **blog** – Blog, content, writing
- **email** – Email, campaign, draft, follow-up
- **automation** – Automation, workflow
- **sales** – Sales, outreach, objection
- **support** – Support, customer, ticket

## Marketplace

Templates also appear in the [Marketplace](/app/marketplace) with:

- **Tags** – Search and filter by tag
- **Category** – Filter by category
- **Description** – Full template description
- **Rating** – Star rating from users
- **Downloads** – Install count

## Seeding Templates

To populate the library with 50–100 system templates:

```bash
pnpm exec tsx scripts/seed-templates.ts
```

Requires `MONGODB_URI` in `.env` or `.env.local`.

The script:

1. Inserts templates into `action_templates`
2. Publishes system templates to `marketplace_templates` (author: ALEXZA)

## Template Structure

Each template includes:

| Field          | Description                          |
|----------------|--------------------------------------|
| name           | Display name                         |
| description    | What the template does                |
| category       | content, marketing, data_extraction, productivity, agents, etc. |
| tags           | Search tags (seo, blog, email, etc.) |
| promptTemplate | Prompt with `{{variable}}` placeholders |
| inputSchema    | JSON Schema for input                |
| outputSchema   | Optional JSON Schema for output      |
| defaultModel   | Model for execution                  |

## API Reference

### Public

| Method | Path                    | Description              |
|--------|-------------------------|--------------------------|
| GET    | `/api/templates`        | List templates (filter by `category`, `q`) |
| GET    | `/api/templates/:id`    | Get template detail      |
| POST   | `/api/templates/:id/apply` | Apply template to project (auth required) |

**Apply body:**

```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "overrideName": "my_summarize"
}
```

### Admin (x-admin-key header)

| Method | Path                       | Description      |
|--------|----------------------------|------------------|
| POST   | `/api/admin/templates`     | Create template  |
| PATCH  | `/api/admin/templates/:id` | Update template  |
| DELETE | `/api/admin/templates/:id` | Delete template  |

## Permissions

- **Public templates** – visible to all authenticated users.
- **Private templates** – visible only to the owner.
- **Apply** – requires project access and `actions:manage` permission in the workspace.
