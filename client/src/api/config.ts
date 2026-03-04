/**
 * Public config API - pricing and display values.
 * No auth required.
 */

import { apiRequest } from "@/lib/api";

export interface PublicConfigResponse {
  ok: boolean;
  creditPrice: number;
  creditsPerThousandTokens: number;
}

/** Default fallback when API is unavailable (matches backend default). */
export const DEFAULT_CREDIT_PRICE = 0.003;
export const DEFAULT_TOKENS_PER_CREDIT = 1000;

export async function fetchPublicConfig(): Promise<PublicConfigResponse> {
  return apiRequest<PublicConfigResponse>("/api/public/config");
}
