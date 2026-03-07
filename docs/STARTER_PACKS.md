# ALEXZA AI Starter Packs

Starter Packs let you install a group of templates at once into a project.

## Overview

- **Browse** – View packs at [Starter Packs](/app/packs)
- **Install** – Install all templates in a pack into a project with one click
- **Skip duplicates** – Existing actions are skipped; new ones are created

## Database Collection

### template_packs

| Field       | Type     | Description                    |
|------------|----------|--------------------------------|
| name       | string   | Pack name                      |
| description| string   | Pack description               |
| templateIds| ObjectId[] | Refs to action_templates    |
| agents     | array    | Agent configs (future)         |
| workflows  | array    | Workflow configs (future)      |
| tags       | string[] | Search tags                    |
| createdAt  | Date     |                                |
| updatedAt  | Date     |                                |

## API Reference

### GET /api/packs

Browse packs. Query params: `q` (search), `tags`, `limit`.

### GET /api/packs/:id

Get pack detail including template names.

### POST /api/packs/:id/install

Install pack into project. Requires auth.

**Body:**
```json
{
  "projectId": "507f1f77bcf86cd799439011"
}
```

**Response:**
```json
{
  "ok": true,
  "installed": [
    { "actionName": "seo_article_writer", "templateName": "SEO Article Writer" }
  ],
  "skipped": [
    { "actionName": "blog_generator", "reason": "Already exists" }
  ]
}
```

## Seeding Packs

1. Seed templates first: `pnpm exec tsx scripts/seed-templates.ts`
2. Seed packs: `pnpm exec tsx scripts/seed-packs.ts`

Packs reference templates by name. If a template is missing, it is skipped when creating the pack.

## Available Starter Packs

| Pack                  | Templates                                                                 |
|-----------------------|---------------------------------------------------------------------------|
| SEO Pack              | SEO Article Writer, Meta Description, Headline Generator, Blog Outline, Long-form Article |
| Marketing Pack        | Email Campaign, Product Description, Lead Follow-up, Ad Copy AIDA, Social Media, Landing Page |
| Customer Support Pack | Ticket Triage, Support Response, FAQ Generator, Feedback Response, Apology Email |
| Sales Automation Pack | Cold Email, Objection Handler, Lead Follow-up, Sales Agent, Thank You, Testimonial Request |
| Research Pack         | Research Agent, Document Summarizer, Meeting Notes, Executive Summary, Competitor Analysis |
