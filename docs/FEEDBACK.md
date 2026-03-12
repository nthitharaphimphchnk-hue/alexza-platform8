# Feedback Collection & In-App Widget

This document describes how ALEXZA AI collects in-product feedback during soft launch and beyond.

## Overview

To capture bugs, feature requests, UX issues, and general feedback from real users, the app includes:

- A persistent **“Send Feedback”** button inside the authenticated app shell.
- A feedback modal that lets users describe their issue or idea.
- A backend API and `feedback` collection in MongoDB.
- An admin page to review feedback.

All feedback is stored centrally so product and engineering teams can review and triage it.

## In-app feedback widget

Inside the main app shell (all `/app/*` pages), users see a small floating button in the bottom-right corner:

- Label: **Send Feedback**
- Location: bottom-right of the viewport, above other content.
- Style: unobtrusive, using the existing design system (rounded pill, subtle border, Lucide icon).

Clicking the button opens a modal:

- **Feedback type** (required)
  - `bug`
  - `feature request`
  - `UX issue`
  - `general feedback`
- **Message** textarea (required)
- **Email** (optional, prefilled if the user is logged in)

The widget automatically attaches context (see below) so users don&apos;t need to manually describe where they were in the app.

## Backend API & storage

Feedback is stored in the `feedback` collection with the following fields:

- `type` – one of `bug`, `feature`, `ux`, `general`.
- `message` – free-form text.
- `email` – optional contact email.
- `userId` – ObjectId of the authenticated user (if logged in).
- `workspaceId` – ObjectId of the current workspace (if available).
- `route` – current route/path inside the app (e.g. `/app/projects/123`).
- `userAgent` – browser user agent string.
- `createdAt` – timestamp of submission.
- `status` – one of:
  - `new`
  - `triaged`
  - `in_progress`
  - `resolved`
  - `closed`
- `priority` – one of:
  - `low`
  - `medium`
  - `high`
  - `critical`
- `assigneeUserId` – optional ObjectId of the internal user handling the feedback.
- `internalNotes` – optional internal notes visible only to admins.

### Endpoints

- `POST /api/feedback`
  - Requires authentication.
  - Request body:
    - `type`: `"bug" | "feature" | "ux" | "general"`
    - `message`: string
    - `email?`: string (optional)
    - `route?`: string (optional; usually captured by the client)
    - `workspaceId?`: string (optional)
  - Response:
    - `{ "ok": true, "id": "<feedbackId>" }` on success.

- `GET /api/admin/feedback`
  - Admin-only, protected by `ADMIN_API_KEY` via the `x-admin-key` header.
  - Query parameters:
    - `type?`: filter by feedback type.
    - `status?`: `new | triaged | in_progress | resolved | closed`.
    - `priority?`: `low | medium | high | critical`.
    - `assignee?`: `"assigned" | "unassigned"`.
    - `dateFrom?`: ISO date string.
    - `dateTo?`: ISO date string.
  - Response:
    - `{ "ok": true, "items": [ { id, type, message, email, userId, workspaceId, route, userAgent, createdAt, status, priority, assigneeUserId, internalNotes } ] }`

- `PATCH /api/admin/feedback/:id`
  - Admin-only, protected by `ADMIN_API_KEY`.
  - Allows updating:
    - `status`
    - `priority`
    - `assigneeUserId`
    - `internalNotes`
  - Response: `{ "ok": true, "updated": boolean }`

- `GET /api/admin/feedback/stats`
  - Admin-only, protected by `ADMIN_API_KEY`.
  - Returns high-level aggregates:
    - `byStatus`: counts by status.
    - `byPriority`: counts by priority.
    - `byType`: counts by feedback type.

## Context capture

When a user submits feedback via the in-app widget, the client automatically includes:

- **Route** – `window.location.pathname + window.location.search`.
- **User** – mapped on the server as `userId` from the authenticated session.
- **Workspace** – `workspaceId` from the current workspace context (if present).
- **Browser** – `userAgent` from the request headers.
- **Timestamp** – `createdAt` set by the server.

This makes it easier to reproduce issues and understand where feedback came from.

## Admin feedback page

Admins can review feedback via:

- Route: `/app/admin/feedback`

The page shows:

- Summary cards at the top:
  - **New** – count of feedback with `status = new`.
  - **In Progress** – count of `triaged + in_progress`.
  - **Resolved** – count of `resolved`.
  - **Critical** – count of `priority = critical`.
- A table of feedback items with columns:
  - Created time
  - Type
  - Priority
  - Status
  - User (email or userId)
  - Workspace ID
  - Route
  - Message (truncated)
- Filters:
  - Type (`bug`, `feature`, `ux`, `general`, or all).
  - Status (`new`, `triaged`, `in_progress`, `resolved`, `closed`, or all).
  - Priority (`low`, `medium`, `high`, `critical`, or all).
  - Assignee (`assigned`, `unassigned`, or all).
  - Date range (`From` / `To`).
- A detail panel for the selected feedback item, allowing:
  - Viewing full message and context (user, workspace, route).
  - Editing `status`, `priority`, `assigneeUserId`, and `internalNotes`.
  - Quick actions:
    - Mark triaged
    - Mark in progress
    - Mark resolved
    - Close

Admin triage actions are logged via the structured logger without including full message content, so sensitive details are not duplicated in logs.

## Triage workflow & guidelines

### Status meanings

- **new** – freshly submitted feedback, not yet reviewed.
- **triaged** – reviewed and categorized; understood but not yet being worked on.
- **in_progress** – actively being addressed (bug fix or feature work in progress).
- **resolved** – a fix or change has been implemented and released.
- **closed** – no further action planned (e.g. duplicate, out of scope, or fully resolved and verified).

### Priority guidelines

- **critical**
  - Outage or major regression.
  - Data loss, security issue, or billing-impacting bug.
  - Must be addressed immediately during soft launch.
- **high**
  - Severe UX or functional issue affecting many users.
  - Blocks a key onboarding path or core flow (e.g. cannot create projects, cannot run AI).
- **medium**
  - Non-blocking bug, papercut, or UX annoyance.
  - Important feature requests that are not urgent.
- **low**
  - Minor visual issues, copy polish, or nice-to-have features.

### Suggested soft launch process

1. Encourage early adopters to use the **“Send Feedback”** button for any issue or idea.
2. Have a product owner or support engineer check `/app/admin/feedback` at least once per day:
   - Set **status** to `triaged` and a sensible **priority** for all new items.
   - Mark high-priority bugs and UX issues as `in_progress` and assign an owner.
   - Mark duplicates or out-of-scope items as `closed` with a short internal note.
3. For each release:
   - Move completed items to `resolved` and then `closed` once verified in production.
4. On a weekly basis:
   - Review `critical` and `high`-priority feedback trends using the summary cards and stats.
   - Feed accepted feature requests into the roadmap.
5. As the product matures, consider:
   - Integrating the feedback triage board with external tools (Jira, Linear, Notion).
   - Surfacing feedback stats in broader admin dashboards.


