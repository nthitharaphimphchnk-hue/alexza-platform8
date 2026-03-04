# ALEXZA AI Action Templates

Action Templates let you add high-quality, pre-built Actions to your project in one click.

## Overview

- **Templates library**: Browse templates at [Templates](/app/templates) or `/app/templates`.
- **Categories**: Summarize, Translate, Extraction, Writing, Support, Other.
- **Apply**: Select a template and a project to create a new Action with the template's prompt and schemas.

## Using Templates

### 1. Open the Templates page

From the sidebar, click **Templates** (or go to `/app/templates`).


### 2. Search and filter

- Use the search box to find templates by name, description, or tags.
- Use the category dropdown to filter by type (e.g. Summarize, Translate, Writing).

### 3. Apply a template

1. Click **Apply to Project** on a template card.
2. In the dialog, select the project where you want to add the Action.
3. Click **Apply**.
4. You'll be redirected to the project page. The new Action appears in the Actions list.

### 4. Use the Action

The created Action uses the template's:

- **Prompt template** – e.g. `Summarize the following text in 2-3 concise sentences. Keep the key points.\n\nText:\n{{text}}`
- **Input schema** – e.g. `{ text: string }`
- **Output schema** – if defined by the template

You can edit the Action in the project settings after applying.

## Template Categories

| Category   | Examples                                      |
|-----------|------------------------------------------------|
| Summarize | Short summary, Long summary                    |
| Translate | Thai ↔ English                                |
| Extraction| Contact info, Named entities                   |
| Writing   | AIDA ad copy, FAQ generator, Email draft     |
| Support   | Ticket triage, Response draft                 |
| Other     | Meeting notes, Paraphrase, Simplify           |

## Seeding Templates

To populate the library with 20 system templates:

```bash
pnpm exec tsx scripts/seed-templates.ts
```

Requires `MONGODB_URI` in `.env` or `.env.local`.

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
