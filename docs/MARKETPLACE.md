# ALEXZA AI Action Marketplace

The Action Marketplace lets users publish, browse, and install AI action templates shared by the community.

## Overview

- **Marketplace page**: Browse at [Marketplace](/app/marketplace) or `/app/marketplace`.
- **Sections**: Trending, Popular, New.
- **Publish**: Publish an existing action from your project or an action template you own.
- **Install**: One-click install creates an action in your project.
- **Rating**: Star rating (1–5) for templates.

## Using the Marketplace

### 1. Open the Marketplace

From the sidebar, click **Marketplace** (or go to `/app/marketplace`).

### 2. Browse sections

- **Trending** – Templates ranked by downloads and rating.
- **Popular** – Most downloaded templates.
- **New** – Recently published templates.

### 3. Search and filter

- Use the search box to find templates by name, description, or tags.
- Click **Search** to run the query.
- Click **Clear** to return to the section view.

### 4. Install a template

1. Click **Install** on a template card.
2. In the dialog, select the project where you want to add the action.
3. Click **Install**.
4. You’ll be redirected to the project page. The new action appears in the Actions list.

### 5. Rate a template

Click the star icons on a template card to give a rating from 1 to 5. Your rating updates the template’s average.

## Publishing to the Marketplace

### From a project action

1. Create an action in your project (via Chat Builder or project settings).
2. Call the publish API with `projectId` and `actionName`:

```bash
curl -X POST /api/marketplace/publish \
  -H "Content-Type: application/json" \
  -d '{"projectId": "YOUR_PROJECT_ID", "actionName": "my_summarize", "tags": ["summarize", "text"]}'
```

### From an existing template

If you own an action template (e.g. created via admin API), you can publish it with `templateId`:

```bash
curl -X POST /api/marketplace/publish \
  -H "Content-Type: application/json" \
  -d '{"templateId": "TEMPLATE_OBJECT_ID", "name": "My Template", "tags": ["custom"]}'
```

### Publish body options

| Field       | Type     | Required | Description                                      |
|------------|----------|----------|--------------------------------------------------|
| templateId | string   | No*      | ObjectId of an existing action template         |
| projectId  | string   | No*      | Project containing the action to publish        |
| actionName | string   | No*      | Action name within the project                   |
| name       | string   | No       | Display name (default: template/action name)     |
| description| string   | No       | Description (default: from template/action)      |
| tags       | string[] | No       | Tags for search                                 |
| visibility | string   | No       | `"public"` or `"private"` (default: public)     |

\* Provide either `templateId` or both `projectId` and `actionName`.

## API Reference

### Browse

| Method | Path                     | Description                          |
|--------|--------------------------|--------------------------------------|
| GET    | `/api/marketplace`       | List templates (query: `q`, `tags`, `section`, `limit`) |
| GET    | `/api/marketplace/sections` | Get Trending, Popular, New sections (query: `limit`) |
| GET    | `/api/marketplace/:id`   | Get template detail                  |

### Publish (auth required)

| Method | Path                       | Description              |
|--------|----------------------------|--------------------------|
| POST   | `/api/marketplace/publish` | Publish a template       |

### Install (auth required)

| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| POST   | `/api/marketplace/:id/install` | Install template into project |

**Install body:**

```json
{
  "projectId": "507f1f77bcf86cd799439011",
  "overrideName": "my_custom_name"
}
```

### Rating (auth required)

| Method | Path                       | Description        |
|--------|----------------------------|--------------------|
| POST   | `/api/marketplace/:id/rate` | Submit star rating (1–5) |

**Rate body:**

```json
{
  "rating": 5
}
```

## Database

### marketplace_templates

| Field        | Type     | Description                    |
|-------------|----------|--------------------------------|
| name        | string   | Display name                   |
| description | string   | Description                    |
| author      | string   | Author display name            |
| authorUserId| ObjectId | Author user ID                 |
| templateId  | ObjectId | References action_templates   |
| tags        | string[] | Search tags                    |
| downloads   | number   | Install count                  |
| rating      | number   | Average rating (0–5)           |
| ratingCount | number   | Number of ratings              |
| visibility  | string   | `"public"` or `"private"`      |
| createdAt   | Date     | Publish time                   |
| updatedAt   | Date     | Last update                    |

### marketplace_ratings

| Field                 | Type     | Description        |
|-----------------------|----------|--------------------|
| marketplaceTemplateId | ObjectId | Template reference |
| userId                | ObjectId | User who rated     |
| rating                | number   | 1–5                |
| createdAt             | Date     | Rating time        |

## Permissions

- **Browse** – Public templates are visible to all users (including unauthenticated for GET).
- **Publish** – Requires authentication. User must own the project action or the action template.
- **Install** – Requires authentication and `actions:manage` permission on the target project.
- **Rate** – Requires authentication.
