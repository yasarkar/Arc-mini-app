"use client";

import { useAccount, useBalance } from "wagmi";
import { arcTestnet } from "@/config/arcChain";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ChainBalance {
  id: string;
  name: string;
  symbol: string;
  balance: number;
  isReal: boolean;
  color: string; // tailwind colour class for the dot / accent
}

export interface UnifiedBalanceResult {
  /** Sum of all chain balances (real + mock) */
  totalUnified: number;
  /** Per-chain breakdown */
  chains: ChainBalance[];
  /** Whether the real Arc balance is still loading */
  isLoading: boolean;
  /** Whether the wallet is connected */
  isConnected: boolean;
}

// ---------------------------------------------------------------------------
// Mock data for chains that aren't Arc Testnet
// ---------------------------------------------------------------------------
const MOCK_CHAINS: Omit<ChainBalance, "isReal">[] = [
  { id: "base", name: "Base", symbol: "USDC", balance: 45.5, color: "#0052FF" },
  { id: "arbitrum", name: "Arbitrum", symbol: "USDC", balance: 80.0, color: "#2D374B" },
  { id: "solana", name: "Solana", symbol: "USDC", balance: 24.5, color: "#9945FF" },
];

// USDC ERC-20 address on Arc
const USDC_ADDRESS = "0x3600000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// useUnifiedBalance
// ---------------------------------------------------------------------------
export function useUnifiedBalance(): UnifiedBalanceResult {
  const { address, isConnected } = useAccount();

  // Real Arc Testnet balance — native gas is USDC (6 decimals on Arc)
  const { data: arcBalance, isLoading: arcLoading } = useBalance({
    address,
    token: USDC_ADDRESS,
    chainId: arcTestnet.id,
  });

  const realArcAmount = arcBalance
    ? Number(arcBalance.formatted)
    : 0;

  const chains: ChainBalance[] = [
    {
      ...MOCK_CHAINS[0],
      isReal: false,
    },
    {
      ...MOCK_CHAINS[1],
      isReal: false,
    },
    {
      ...MOCK_CHAINS[2],
      isReal: false,
    },
    {
      id: "arc",
      name: "Arc Testnet",
      symbol: "USDC",
      balance: isConnected ? realArcAmount : 0,
      isReal: isConnected,
      color: "#00D4AA",
    },
  ];

  const totalUnified = chains.reduce((sum, c) => sum + c.balance, 0);

  return {
    totalUnified,
    chains,
    isLoading: arcLoading,
    isConnected,
  };
}