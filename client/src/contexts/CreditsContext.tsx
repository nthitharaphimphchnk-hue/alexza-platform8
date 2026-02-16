import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type CreditsMode = 'Normal' | 'Pro' | 'Premium';

export interface Transaction {
  id: string;
  type: 'usage' | 'purchase' | 'bonus' | 'refund';
  description: string;
  amount: number;
  creditsChange: number;
  date: string;
  mode: CreditsMode;
}

export interface CreditsContextType {
  creditsRemaining: number;
  selectedMode: CreditsMode;
  transactions: Transaction[];
  setSelectedMode: (mode: CreditsMode) => void;
  deductCredits: (amount: number, description: string) => boolean;
  addCredits: (amount: number, description: string, type: 'purchase' | 'bonus' | 'refund') => void;
  getModeMultiplier: () => number;
  resetCredits: () => void;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

const INITIAL_CREDITS = 50000;
const STORAGE_KEY = 'alexza_credits_state';

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [creditsRemaining, setCreditsRemaining] = useState(INITIAL_CREDITS);
  const [selectedMode, setSelectedMode] = useState<CreditsMode>('Normal');
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { credits, mode, txns } = JSON.parse(stored);
        setCreditsRemaining(credits);
        setSelectedMode(mode);
        setTransactions(txns);
      } catch (error) {
        console.error('Failed to load credits from localStorage:', error);
      }
    }
  }, []);

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        credits: creditsRemaining,
        mode: selectedMode,
        txns: transactions,
      })
    );
  }, [creditsRemaining, selectedMode, transactions]);

  const getModeMultiplier = (): number => {
    switch (selectedMode) {
      case 'Normal':
        return 1;
      case 'Pro':
        return 2;
      case 'Premium':
        return 4;
      default:
        return 1;
    }
  };

  const deductCredits = (amount: number, description: string): boolean => {
    if (creditsRemaining < amount) {
      return false; // Insufficient credits
    }

    const newCredits = creditsRemaining - amount;
    setCreditsRemaining(newCredits);

    // Add transaction
    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      type: 'usage',
      description,
      amount: 0, // Usage doesn't have a dollar amount
      creditsChange: -amount,
      date: new Date().toLocaleString(),
      mode: selectedMode,
    };

    setTransactions((prev) => [transaction, ...prev]);
    return true;
  };

  const addCredits = (
    amount: number,
    description: string,
    type: 'purchase' | 'bonus' | 'refund'
  ): void => {
    const creditsToAdd = Math.floor(amount * 100); // $1 = 100 credits
    const newCredits = creditsRemaining + creditsToAdd;
    setCreditsRemaining(newCredits);

    const transaction: Transaction = {
      id: `txn_${Date.now()}`,
      type,
      description,
      amount,
      creditsChange: creditsToAdd,
      date: new Date().toLocaleString(),
      mode: selectedMode,
    };

    setTransactions((prev) => [transaction, ...prev]);
  };

  const resetCredits = (): void => {
    setCreditsRemaining(INITIAL_CREDITS);
    setSelectedMode('Normal');
    setTransactions([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: CreditsContextType = {
    creditsRemaining,
    selectedMode,
    transactions,
    setSelectedMode,
    deductCredits,
    addCredits,
    getModeMultiplier,
    resetCredits,
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits(): CreditsContextType {
  const context = useContext(CreditsContext);
  if (!context) {
    throw new Error('useCredits must be used within CreditsProvider');
  }
  return context;
}
