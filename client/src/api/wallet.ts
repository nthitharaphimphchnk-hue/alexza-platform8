/**
 * Wallet API client - balance, transactions, manual topup.
 */

import { apiRequest } from "@/lib/api";

export interface WalletBalanceResponse {
  ok: boolean;
  balanceCredits: number;
  tokensPerCredit?: number;
  creditPrice?: number;
  freeCredits?: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: string;
  amountCredits: number;
  reason: string;
  relatedRunId: string | null;
  usageLogId: string | null;
  totalTokens: number | null;
  createdAt: string;
}

export interface WalletTransactionsResponse {
  ok: boolean;
  transactions: WalletTransaction[];
  nextCursor?: string | null;
}

export interface ManualTopupResponse {
  ok: boolean;
  balanceCredits: number;
  creditsAdded: number;
  userId: string;
}

export async function fetchWalletBalance(): Promise<WalletBalanceResponse> {
  return apiRequest<WalletBalanceResponse>("/api/wallet/balance");
}

export async function fetchWalletTransactions(
  limit = 50,
  cursor?: string
): Promise<WalletTransactionsResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);
  return apiRequest<WalletTransactionsResponse>(`/api/wallet/transactions?${params.toString()}`);
}

export async function manualTopup(params: {
  userId: string;
  credits: number;
  reason?: string;
  adminKey: string;
}): Promise<ManualTopupResponse> {
  return apiRequest<ManualTopupResponse>("/api/wallet/topup/manual", {
    method: "POST",
    headers: {
      "x-admin-key": params.adminKey,
    },
    body: {
      userId: params.userId,
      credits: params.credits,
      reason: params.reason ?? "dev topup",
    },
  });
}
