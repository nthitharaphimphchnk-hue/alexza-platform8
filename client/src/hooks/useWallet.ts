/**
 * Wallet hooks - polling-based (no React Query).
 * Provides useWalletBalance, useWalletTransactions, and invalidateWallet for realtime updates.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchWalletBalance,
  fetchWalletTransactions,
  type WalletBalanceResponse,
  type WalletTransactionsResponse,
} from "@/api/wallet";
import { ApiError } from "@/lib/api";

const BALANCE_POLL_MS = 15_000;
const TX_POLL_MS = 20_000;
const STALE_MS = 10_000;

const WALLET_INVALIDATE_EVENT = "wallet-invalidate";

export function invalidateWallet(): void {
  window.dispatchEvent(new CustomEvent(WALLET_INVALIDATE_EVENT));
}

export interface UseWalletBalanceResult {
  data: WalletBalanceResponse | null;
  balanceCredits: number;
  tokensPerCredit: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWalletBalance(): UseWalletBalanceResult {
  const [data, setData] = useState<WalletBalanceResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastFetchRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWalletBalance();
      if (mountedRef.current) {
        setData(res);
        lastFetchRef.current = Date.now();
      }
    } catch (e) {
      if (mountedRef.current) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load balance";
        setError(msg);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refetch();

    const onInvalidate = () => void refetch();
    window.addEventListener(WALLET_INVALIDATE_EVENT, onInvalidate);

    const interval = setInterval(() => {
      const elapsed = Date.now() - lastFetchRef.current;
      if (elapsed >= BALANCE_POLL_MS) void refetch();
    }, BALANCE_POLL_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener(WALLET_INVALIDATE_EVENT, onInvalidate);
      clearInterval(interval);
    };
  }, [refetch]);

  return {
    data,
    balanceCredits: data?.balanceCredits ?? 0,
    tokensPerCredit: data?.tokensPerCredit ?? 1000,
    isLoading,
    error,
    refetch,
  };
}

export interface UseWalletTransactionsResult {
  data: WalletTransactionsResponse | null;
  transactions: WalletTransactionsResponse["transactions"];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWalletTransactions(limit = 50): UseWalletTransactionsResult {
  const [data, setData] = useState<WalletTransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    if (!mountedRef.current) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchWalletTransactions(limit);
      if (mountedRef.current) {
        setData(res);
      }
    } catch (e) {
      if (mountedRef.current) {
        const msg = e instanceof ApiError ? e.message : e instanceof Error ? e.message : "Failed to load transactions";
        setError(msg);
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    mountedRef.current = true;
    void refetch();

    const onInvalidate = () => void refetch();
    window.addEventListener(WALLET_INVALIDATE_EVENT, onInvalidate);

    const interval = setInterval(refetch, TX_POLL_MS);

    return () => {
      mountedRef.current = false;
      window.removeEventListener(WALLET_INVALIDATE_EVENT, onInvalidate);
      clearInterval(interval);
    };
  }, [refetch]);

  return {
    data,
    transactions: data?.transactions ?? [],
    isLoading,
    error,
    refetch,
  };
}
