"use client";

import { useState, useEffect, useCallback } from "react";
import type { TransactionRecord } from "@/types/history";

const STORAGE_KEY = "arc_transaction_history_v2";

// Initial seed mock data matching Solscan structure & ArcFlow capabilities
const INITIAL_MOCK_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "tx-solscan-101",
    txHash: "5jJiHURXph5tXb6fqA12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4",
    type: "AMM_BUY",
    actionTag: "AMM: Buy",
    amount: "1.01",
    token: "USDC",
    fromAddress: "B7kcP7xq54...mDoNHGdRYY",
    toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    timestamp: Date.now() - (1 * 3600 + 20 * 60) * 1000, // 1h 20m ago
    blockNumber: 5042189,
    fee: "0.00025 USDC",
    program: "Arc Liquidity Pool v2",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/5jJiHURXph5tXb6fqA12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4",
  },
  {
    id: "tx-solscan-102",
    txHash: "2BAdUWfVYfXGRC10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "AMM_SELL",
    actionTag: "AMM: Sell",
    amount: "0.4517",
    token: "USDC",
    fromAddress: "B7kcP7xq54...mDoNHGdRYY",
    toAddress: "0x3C44CdD06a90066462549117282866245149725c",
    timestamp: Date.now() - (18 * 3600 + 57 * 60) * 1000, // 18h 57m ago
    blockNumber: 5041920,
    fee: "0.00018 USDC",
    program: "Arc Swap Engine",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/2BAdUWfVYfXGRC10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-103",
    txHash: "awgB8tPr8K1Ghq10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "PRIVACY_SEND",
    actionTag: "Opt-in: Privacy",
    amount: "0.5121",
    token: "USDC",
    fromAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    toAddress: "0x8f7a213e4b9c8d10e11a22b33c44d55e66f77a88",
    timestamp: Date.now() - (19 * 3600 + 34 * 60) * 1000, // 19h 34m ago
    blockNumber: 5041850,
    fee: "0.00045 USDC",
    program: "Opt-in ZK Proof Privacy",
    vkeyArc: "vkey_arc_98f7a213e4b9c8d10e11a22b33c44d55e66f77a8",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/awgB8tPr8K1Ghq10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-104",
    txHash: "3Fid4CMapJmyRqC10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "UNIFIED_BALANCE",
    actionTag: "CCTP: Bridge",
    amount: "2.70",
    token: "USDC",
    fromAddress: "0x84532...BaseSepolia",
    toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    timestamp: Date.now() - (22 * 3600 + 29 * 60) * 1000, // 22h 29m ago
    blockNumber: 5041700,
    fee: "0.00030 USDC",
    program: "Circle CCTP Protocol v2",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/3Fid4CMapJmyRqC10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-105",
    txHash: "4r5LufBoQJAjLuGaG10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "AGENT_JOB",
    actionTag: "Agent: Executed",
    amount: "1.96",
    token: "USDC",
    fromAddress: "0x8183...ERC8183Agent",
    toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    timestamp: Date.now() - (23 * 3600 + 9 * 60) * 1000, // 23h 9m ago
    blockNumber: 5041650,
    fee: "0.00020 USDC",
    program: "ERC-8183 Autonomous Agent",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/4r5LufBoQJAjLuGaG10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-106",
    txHash: "493BmpScmWCVN10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "STANDARD_SEND",
    actionTag: "Arc: Send",
    amount: "2.02",
    token: "USDC",
    fromAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    toAddress: "B7kcP7xq54...mDoNHGdRYY",
    timestamp: Date.now() - 24 * 3600 * 1000, // 1d ago
    blockNumber: 5041500,
    fee: "0.00010 USDC",
    program: "Arc Core Token Standard",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/493BmpScmWCVN10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-107",
    txHash: "48GCKAaqv3TAzCk10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "STANDARD_SEND",
    actionTag: "Burn Token",
    amount: "0.02039",
    token: "USDC",
    fromAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    toAddress: "0x0000000000000000000000000000000000000000",
    timestamp: Date.now() - 9 * 24 * 3600 * 1000 - 14 * 3600 * 1000, // 9d 14h ago
    blockNumber: 5032100,
    fee: "0.00005 USDC",
    program: "Arc Token Burn Routine",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/48GCKAaqv3TAzCk10e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
  {
    id: "tx-solscan-108",
    txHash: "3Nh9A5FDLbii34jq410e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
    type: "AMM_BUY",
    actionTag: "ArcSwap: Swap",
    amount: "0.1415",
    token: "USDC",
    fromAddress: "B7kcP7xq54...mDoNHGdRYY",
    toAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
    timestamp: Date.now() - 9 * 24 * 3600 * 1000 - 14 * 3600 * 1000, // 9d 14h ago
    blockNumber: 5032095,
    fee: "0.00012 USDC",
    program: "Arc DEX Router",
    status: "SUCCESS",
    explorerUrl: "https://testnet.arcscan.app/tx/3Nh9A5FDLbii34jq410e11a22b33c44d55e66f77a88b99c00d11e22f33a44b55c66",
  },
];

export function getStoredTransactions(): TransactionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TRANSACTIONS));
      return INITIAL_MOCK_TRANSACTIONS;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse transaction history from localStorage:", err);
    return INITIAL_MOCK_TRANSACTIONS;
  }
}

export function saveTransactions(records: TransactionRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    window.dispatchEvent(new Event("tx-history-update"));
  } catch (err) {
    console.error("Failed to save transaction history to localStorage:", err);
  }
}

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTransactions = useCallback(() => {
    setIsLoading(true);
    const data = getStoredTransactions();
    setTransactions(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadTransactions();

    const handleUpdate = () => loadTransactions();
    window.addEventListener("tx-history-update", handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener("tx-history-update", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [loadTransactions]);

  const addTransaction = useCallback(
    (record: Omit<TransactionRecord, "id" | "timestamp"> & { timestamp?: number }) => {
      const current = getStoredTransactions();
      const newRecord: TransactionRecord = {
        ...record,
        id: `tx-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: record.timestamp ?? Date.now(),
        blockNumber: record.blockNumber ?? Math.floor(5042000 + Math.random() * 1000),
        fee: record.fee ?? "0.00015 USDC",
        program: record.program ?? "Arc Core Token Standard",
      };

      const updated = [newRecord, ...current];
      saveTransactions(updated);
      setTransactions(updated);
      return newRecord;
    },
    [],
  );

  const clearHistory = useCallback(() => {
    saveTransactions([]);
    setTransactions([]);
  }, []);

  return {
    transactions,
    isLoading,
    addTransaction,
    clearHistory,
    refetch: loadTransactions,
  };
}
