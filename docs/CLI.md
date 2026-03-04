# ALEXZA AI CLI

Command line interface for developers to interact with the ALEXZA AI platform.

## Installation

```bash
npm install -g alexza-cli
```

Or with pnpm:

```bash
pnpm add -g alexza-cli
```

## Quick Start

1. **Login** – Store your API key locally:

   ```bash
   alexza login
   ```

   You'll be prompted for your API key. Create one in the [ALEXZA AI dashboard](/app) under Project → API Keys.

2. **List projects**:

   ```bash
   alexza projects
   ```

3. **List actions** in a project:

   ```bash
   alexza actions --project <projectId>
   ```

4. **Run an action**:

   ```bash
   alexza run summarize --project <projectId> --input '{"text":"Hello world"}'
   ```

## Commands

| Command | Description |
|---------|-------------|
| `alexza login` | Store API key in `~/.alexza/config.json` |
| `alexza projects` | List user projects |
| `alexza actions` | List actions in project (`--project`) |
| `alexza run <action>` | Run action (`--project`, `--input`) |
| `alexza logs` | Fetch request logs |
| `alexza usage` | Show analytics summary |

## Configuration

Config is stored at `~/.alexza/config.json`:

```json
{
  "apiKey": "your-api-key",
  "baseUrl": "https://alexza-platform8.onrender.com",
  "projectId": "optional-default-project-id"
}
```

- **apiKey** – Required. Set via `alexza login`.
- **baseUrl** – API base URL (default: `http://localhost:3005`).
- **projectId** – Optional default for `run` and `actions` when `--project` is omitted.

## Examples

### Login with options

```bash
alexza login --key YOUR_API_KEY
alexza login --key YOUR_API_KEY --url https://alexza-platform8.onrender.com
alexza login --key YOUR_API_KEY --project YOUR_PROJECT_ID
```

### Run with input from file

```bash
alexza run summarize --project abc123 --input ./input.json
```

### Fetch logs with filters

```bash
alexza logs --project abc123
alexza logs --action summarize --status success
alexza logs --page 2
```

### Usage analytics

```bash
alexza usage
```

Shows credits used, API calls, tokens, and actions run over the last 30 days.

## API Reference

The CLI calls these endpoints:

| Command | Endpoint |
|---------|----------|
| `projects` | `GET /api/projects` |
| `actions` | `GET /api/projects/:id/actions` |
| `run` | `POST /v1/projects/:projectId/run/:actionName` |
| `logs` | `GET /api/requests` |
| `usage` | `GET /api/analytics/overview` |

All requests use the `x-api-key` header with your stored API key.
