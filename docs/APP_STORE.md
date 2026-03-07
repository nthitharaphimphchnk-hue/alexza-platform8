# ALEXZA AI App Store

The App Store lets developers publish apps (plugins/extensions) and users install them into their workspace.

## Overview

- **Browse** – Trending, Popular, New sections at [App Store](/app/store)
- **Publish** – Developers publish apps with name, description, permissions
- **Install** – Users install apps into workspaces (requires workspace manage permission)

## Database Collections

### apps

| Field       | Type     | Description                    |
|------------|----------|--------------------------------|
| name       | string   | App name                       |
| description| string   | App description                |
| author     | string   | Author display name            |
| authorUserId | ObjectId | Author user ID               |
| permissions| string[] | Declared permissions           |
| category   | string?  | productivity, automation, etc. |
| tags       | string[] | Search tags                    |
| downloads  | number   | Install count                  |
| rating     | number   | Average rating 0–5             |
| ratingCount| number   | Number of ratings              |
| visibility | string   | public \| private              |
| createdAt  | Date     |                                |
| updatedAt  | Date     |                                |

### app_versions

| Field    | Type     | Description   |
|----------|----------|---------------|
| appId    | ObjectId | App reference |
| version  | string   | Version string|
| changelog | string? | Optional      |
| createdAt| Date     |               |

### app_installs

| Field           | Type     | Description        |
|-----------------|----------|--------------------|
| appId           | ObjectId | App reference      |
| workspaceId     | ObjectId | Workspace          |
| installedByUserId | ObjectId | User who installed |
| installedAt     | Date     |                    |

## API Reference

### POST /api/apps/publish

Publish an app. Requires auth.

**Body:**
```json
{
  "name": "My App",
  "description": "Does something useful",
  "permissions": ["run:actions", "read:projects"],
  "category": "productivity",
  "tags": ["ai", "automation"],
  "visibility": "public",
  "version": "1.0.0"
}
```

### GET /api/apps

Browse apps. Query params: `q` (search), `category`, `section` (trending|popular|new), `limit`.

### GET /api/apps/sections

Get Trending, Popular, New sections. Query param: `limit` (default 6).

### GET /api/apps/:id

Get app detail.

### POST /api/apps/:id/install

Install app into workspace. Requires auth and workspace manage permission.

**Body:**
```json
{
  "workspaceId": "507f1f77bcf86cd799439011"
}
```

### GET /api/apps/permissions

List available permissions (for publish UI).

## Permissions

Apps must declare permissions they need:

| Permission        | Description                    |
|-------------------|--------------------------------|
| run:actions       | Run AI actions                 |
| read:projects     | Read project metadata          |
| manage:webhooks   | Create/update webhooks         |
| manage:workflows  | Create/update workflows        |

Users see requested permissions when installing. The install flow records the install in `app_installs`; actual permission enforcement is up to the app runtime (future work).
