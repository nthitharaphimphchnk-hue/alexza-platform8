# Multi-Region Deployment

ALEXZA supports multi-region deployment for lower latency and geographic redundancy.

## Region Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `REGION` | Current region ID (e.g. `us`, `eu`, `apac`). When set, this instance identifies as that region. |
| `REGIONS_JSON` | Optional JSON array of region configs. Overrides defaults. |
| `API_BASE_URL` | Fallback API base URL when `REGION` is not set. |

### Default Regions

| ID | Name | API Base URL |
|----|------|--------------|
| us | US East | https://api.alexza.ai |
| eu | EU West | https://eu.api.alexza.ai |
| apac | APAC | https://apac.api.alexza.ai |

### Custom Regions

Set `REGIONS_JSON` to override:

```json
[
  { "id": "us", "name": "US East", "apiBaseUrl": "https://us.your-api.com", "location": "Virginia" },
  { "id": "eu", "name": "EU West", "apiBaseUrl": "https://eu.your-api.com", "location": "Frankfurt" }
]
```

## Webhook Region Awareness

When `REGION` is set, webhook deliveries include:

- **Header**: `X-Alexza-Region: <regionId>`
- **Payload**: `region` field added to the JSON body

Receivers can route or log by region.

## Latency-Aware Routing

### API Endpoints

- `GET /api/public/regions` — List regions with `id`, `name`, `apiBaseUrl`, `location`
- `GET /health` — Returns `region` in response when multi-region

### Client Flow

1. Fetch `GET https://api.alexza.ai/api/public/regions` (or your primary URL)
2. For each region, probe `{apiBaseUrl}/health` and measure latency
3. Use the region with lowest latency as your API base URL

### SDK Helper

```javascript
import { Alexza, discoverBestRegion } from "@alexza-ai/sdk";

const best = await discoverBestRegion("https://api.alexza.ai");
const client = new Alexza(apiKey, { baseUrl: best.apiBaseUrl });
```

## Deployment per Region

1. Deploy the same app to each region (Render, Fly.io, AWS, etc.)
2. Set `REGION=us` (or `eu`, `apac`) per instance
3. Use a shared MongoDB (or multi-region replica set)
4. Use a shared Redis for queues (or per-region Redis with global replication)
5. Point each region's domain to the corresponding instance

### Example: Render

- **US**: `REGION=us` → `api.alexza.ai`
- **EU**: `REGION=eu` → `eu.api.alexza.ai`
- **APAC**: `REGION=apac` → `apac.api.alexza.ai`

### Example: Fly.io

```toml
# fly.toml for eu region
[env]
  REGION = "eu"
  MONGODB_URI = "mongodb+srv://..."
  REDIS_URL = "redis://..."
```

## Single-Region (Default)

When `REGION` is not set, the instance runs in single-region mode:

- No region in health/config responses
- No region in webhook payloads
- `GET /api/public/regions` still returns the default region list for client discovery
