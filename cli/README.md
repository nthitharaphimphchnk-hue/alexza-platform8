# alexza-cli

Official ALEXZA AI command line interface for developers.

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

   You'll be prompted for your API key. Create one in the [ALEXZA AI dashboard](https://alexza-platform8.onrender.com) under Project → API Keys.

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

- `apiKey` – Required. Set via `alexza login`.
- `baseUrl` – API base URL (default: `http://localhost:3005`).
- `projectId` – Optional default for `run` and `actions` when `--project` is omitted.

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

## License

MIT
