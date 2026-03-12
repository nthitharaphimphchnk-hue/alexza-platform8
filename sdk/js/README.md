# @alexza-ai/sdk

Official JavaScript SDK for ALEXZA AI.

## Install

```bash
npm install @alexza-ai/sdk
# or
pnpm add @alexza-ai/sdk
```

## Usage

```javascript
import { Alexza } from "@alexza-ai/sdk";

const client = new Alexza("axza_live_your_api_key");

const result = await client.run({
  project: "507f1f77bcf86cd799439011",
  action: "summarize_text",
  input: { text: "Long text to summarize..." },
});

console.log(result.output);
console.log(result.usage?.tokens);
```

## API

### `new Alexza(apiKey, options?)`

- `apiKey` - Your API key (required)
- `options.baseUrl` - API base URL (default: `https://api.alexza.ai`)

### `discoverBestRegion(discoveryBaseUrl?)`

Probes all regions and returns the one with lowest latency. Use for multi-region routing:

```javascript
import { Alexza, discoverBestRegion } from "@alexza-ai/sdk";

const best = await discoverBestRegion();
const client = new Alexza("axza_xxx", { baseUrl: best.apiBaseUrl });
await client.run({ project, action, input });
```

### `client.run(options)`

- `options.project` - Project ID
- `options.action` - Action name
- `options.input` - Input object matching the action's schema

Returns: `{ ok, requestId, output, creditsCharged?, usage?, latencyMs? }`

### Error handling

```javascript
import { Alexza, AlexzaError } from "@alexza-ai/sdk";

try {
  await client.run({ project, action, input });
} catch (err) {
  if (err instanceof AlexzaError) {
    console.error(err.message, err.status, err.code);
  }
}
```
