# ALEXZA AI Agent Builder

AI Agents use actions, workflows, and webhooks as tools. The agent receives input, decides which tool to call (or responds directly), executes the tool, and returns a response.

## Overview

- **Agents page**: Create and manage agents at [Agents](/app/agents) or `/app/agents`.
- **Tools**: Actions (AI), Workflows, Webhooks.
- **Memory**: Optional conversation memory per session.
- **Run**: `POST /api/agents/run` with `agentId` and `input`.

## Database

### agents

| Field         | Type     | Description                    |
|---------------|----------|--------------------------------|
| name          | string   | Agent name                    |
| description   | string   | Agent description             |
| workspaceId   | ObjectId | Workspace                     |
| ownerUserId   | ObjectId | Owner                         |
| tools         | array    | Tool configs (see below)      |
| memoryEnabled | boolean  | Enable session memory         |
| createdAt     | Date     | Created                       |
| updatedAt     | Date     | Updated                       |

### agent_memory

| Field   | Type     | Description        |
|---------|----------|--------------------|
| agentId | ObjectId | Agent reference    |
| sessionId| string  | Session identifier |
| role    | string   | "user" or "assistant" |
| content | string   | Message content    |
| createdAt| Date    | Timestamp          |

### Tool types

**Action** – run an AI action:
```json
{ "type": "action", "projectId": "...", "actionName": "summarize_text", "label": "Summarize" }
```

**Workflow** – run a workflow:
```json
{ "type": "workflow", "workflowId": "...", "label": "My Workflow" }
```

**Webhook** – call HTTP endpoint:
```json
{ "type": "webhook", "url": "https://...", "method": "POST", "label": "Notify" }
```

## Using Agents

### 1. Create an agent

1. Go to **Agents** in the sidebar.
2. Click **+** to create.
3. Enter name, description, workspace.
4. Enable **Memory** if you want conversation context.
5. Add tools: **+ Action**, **+ Workflow**, **+ Webhook**.
6. For actions: select project and action.
7. For workflows: select workflow.
8. For webhooks: enter URL and method.

### 2. Run an agent

1. Select an agent.
2. Enter your message in the input box.
3. Click **Run**.
4. The agent decides whether to use a tool or respond directly.
5. Output appears below.

### 3. Memory

When memory is enabled, the agent keeps recent messages per `sessionId`. Use the same `sessionId` in API calls for multi-turn conversations.

## API Reference

### CRUD

| Method | Path           | Description      |
|--------|----------------|------------------|
| GET    | `/api/agents`  | List agents      |
| POST   | `/api/agents`  | Create agent     |
| GET    | `/api/agents/:id` | Get agent     |
| PATCH  | `/api/agents/:id` | Update agent  |
| DELETE | `/api/agents/:id` | Delete agent  |

### Run

| Method | Path              | Description       |
|--------|-------------------|-------------------|
| POST   | `/api/agents/run` | Run agent (auth)  |

**Run body:**
```json
{
  "agentId": "507f1f77bcf86cd799439011",
  "input": "Summarize this: ...",
  "sessionId": "optional-session-for-memory"
}
```

**Response:**
```json
{
  "ok": true,
  "output": "...",
  "toolUsed": "action",
  "usage": { "prompt_tokens": 100, "completion_tokens": 50 }
}
```

## Agent Engine

The engine (`server/agents/engine.ts`):

1. Loads agent and optional memory.
2. Builds a system prompt with tool descriptions.
3. Calls the LLM to decide: `TOOL_CALL: ...` or `RESPOND: ...`.
4. If tool call: parses type and args, executes tool.
5. Returns output (and optionally stores in memory).

Tools are executed as follows:

- **action**: Uses `runWorkflowAction` (internal API call with temp key).
- **workflow**: Uses `executeWorkflow`.
- **webhook**: Uses `fetch` to call the URL.

## Permissions

- **List/Create**: Requires auth; workspace access for create.
- **Get/Patch/Delete**: Requires auth; agent must be in user's workspace.
- **Run**: Requires auth; agent must be in user's workspace.
