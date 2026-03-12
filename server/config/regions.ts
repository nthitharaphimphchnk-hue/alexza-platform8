/**
 * Multi-region configuration.
 * Each region has its own API base URL for latency-aware routing.
 */

export interface RegionConfig {
  id: string;
  name: string;
  /** API base URL for this region (e.g. https://us.api.alexza.ai) */
  apiBaseUrl: string;
  /** Optional: region-specific webhook base (for docs/callbacks) */
  webhookBaseUrl?: string;
  /** Geographic label for display */
  location?: string;
}

/** Default regions. Override via REGIONS_JSON env for custom deployment. */
const DEFAULT_REGIONS: RegionConfig[] = [
  { id: "us", name: "US East", apiBaseUrl: "https://api.alexza.ai", location: "Virginia, US" },
  { id: "eu", name: "EU West", apiBaseUrl: "https://eu.api.alexza.ai", location: "Frankfurt, EU" },
  { id: "apac", name: "APAC", apiBaseUrl: "https://apac.api.alexza.ai", location: "Singapore" },
];

let parsedRegions: RegionConfig[] | null = null;

function getRegions(): RegionConfig[] {
  if (parsedRegions) return parsedRegions;
  const raw = process.env.REGIONS_JSON?.trim();
  if (raw) {
    try {
      parsedRegions = JSON.parse(raw) as RegionConfig[];
      if (Array.isArray(parsedRegions) && parsedRegions.length > 0) return parsedRegions;
    } catch {
      /* fallback to default */
    }
  }
  parsedRegions = DEFAULT_REGIONS;
  return parsedRegions;
}

/** Current region ID from env (e.g. REGION=us). Empty = single-region / primary. */
export function getCurrentRegionId(): string {
  return process.env.REGION?.trim() || "";
}

/** Current region config. Returns null if single-region (REGION not set). */
export function getCurrentRegion(): RegionConfig | null {
  const id = getCurrentRegionId();
  if (!id) return null;
  return getRegions().find((r) => r.id === id) ?? null;
}

/** Get region config by ID. */
export function getRegionConfig(regionId: string): RegionConfig | null {
  if (!regionId) return null;
  return getRegions().find((r) => r.id === regionId) ?? null;
}

/** List all configured regions. */
export function listRegions(): RegionConfig[] {
  return getRegions();
}

/** API base URL for this instance (from REGION or API_BASE_URL). */
export function getApiBaseUrl(): string {
  const region = getCurrentRegion();
  if (region?.apiBaseUrl) return region.apiBaseUrl;
  return process.env.API_BASE_URL?.trim() || "";
}
