"use client";

import { useAccount, useBalance } from "wagmi";
import { arcTestnet } from "@/config/arcChain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ChainBalance {
  id: string;
  name: string;
  balance: number;
  symbol: string;
  color: string;
  /** true = demo/simulated balance, false = real onchain balance */
  isMock: boolean;
}

export interface UnifiedBalanceResult {
  /** Sum of all chain balances (real + mock) */
  totalUnified: number;
  /** Per-chain breakdown */
  chains: ChainBalance[];
  /** Whether the real onchain balance is still loading */
  isLoading: boolean;
  /** Whether the wallet is connected */
  isConnected: boolean;
  /** The chain ID the user's wallet is currently connected to */
  connectedChainId: number | null;
}

// USDC ERC-20 address on Arc
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Mock data for chains that aren't the user's connected chain
// ---------------------------------------------------------------------------
const MOCK_CHAINS: Omit<ChainBalance, "isMock">[] = [
  { id: "base", name: "Base", symbol: "USDC", balance: 45.50, color: "#0052FF" },
  { id: "arbitrum", name: "Arbitrum", symbol: "USDC", balance: 80.00, color: "#2D374B" },
  { id: "solana", name: "Solana", symbol: "USDC", balance: 24.50, color: "#9945FF" },
];

// ---------------------------------------------------------------------------
// useUnifiedBalance
// ---------------------------------------------------------------------------
export function useUnifiedBalance(): UnifiedBalanceResult {
  const { address, isConnected, chainId } = useAccount();

  // Real onchain balance — reads whatever chain the wallet is actually on
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    chainId, // dynamic: uses the user's connected chain
  });

  const realBalance = balanceData
    ? parseFloat(balanceData.formatted)
    : 0;

  const connectedChainId = chainId ?? null;

  // Build the portfolio
  const chains: ChainBalance[] = [
    // Mock chains — always shown as simulated
    ...MOCK_CHAINS.map((m) => ({ ...m, isMock: true })),
    // The user's connected chain — real onchain balance
    {
      id: chainId ? `chain_${chainId}` : "arc",
      name: chainId === arcTestnet.id ? "Arc Testnet" : `Chain ${chainId ?? "?"}`,
      symbol: balanceData?.symbol ?? "USDC",
      balance: isConnected ? realBalance : 0,
      color: "#00D4AA",
      isMock: false,
    },
  ];

  const totalUnified = chains.reduce((sum, c) => sum + c.balance, 0);

  return {
    totalUnified,
    chains,
    isLoading: balanceLoading,
    isConnected,
    connectedChainId,
  };
}