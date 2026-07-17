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
  { id: "cosmos", name: "Cosmos Hub", symbol: "ATOM", balance: 12.50, color: "#E8831A" },
];

// Fetch Solana USDC balance
async function fetchSolanaUsdcBalance(address: string): Promise<number> {
  try {
    const res = await fetch("https://api.mainnet-beta.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v" },
          { encoding: "jsonParsed" },
        ],
      }),
    });
    const json = await res.json();
    const accounts = json?.result?.value;
    if (accounts && accounts.length > 0) {
      const balanceInfo = accounts[0].account.data.parsed.info.tokenAmount;
      return balanceInfo.uiAmount || 0;
    }
  } catch (e) {
    console.error("Failed to fetch Solana USDC balance:", e);
  }
  return 0;
}

// Fetch Cosmos ATOM balance
async function fetchCosmosBalance(address: string): Promise<number> {
  try {
    const res = await fetch(`https://cosmos-lcd.publicnode.com/cosmos/bank/v1beta1/balances/${address}`);
    if (!res.ok) return 0;
    const json = await res.json();
    const atomBalance = json?.balances?.find((b: any) => b.denom === "uatom");
    if (atomBalance) {
      return parseFloat(atomBalance.amount) / 1e6; // 1 ATOM = 10^6 uatom
    }
  } catch (e) {
    console.error("Failed to fetch Cosmos balance:", e);
  }
  return 0;
}

import { useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// useUnifiedBalance
// ---------------------------------------------------------------------------
export function useUnifiedBalance() {
  const { address, isConnected, chainId } = useAccount();

  const [solanaAddr, setSolanaAddr] = useState<string | null>(null);
  const [cosmosAddr, setCosmosAddr] = useState<string | null>(null);
  const [solanaBalance, setSolanaBalance] = useState<number>(24.50);
  const [cosmosBalance, setCosmosBalance] = useState<number>(12.50);
  const [isLoadingNonEvm, setIsLoadingNonEvm] = useState<boolean>(false);

  useEffect(() => {
    const updateAddresses = () => {
      if (typeof window !== "undefined") {
        setSolanaAddr(localStorage.getItem("solana_address"));
        setCosmosAddr(localStorage.getItem("cosmos_address"));
      }
    };

    updateAddresses();
    window.addEventListener("wallet-connection-update", updateAddresses);
    return () => {
      window.removeEventListener("wallet-connection-update", updateAddresses);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchBalances = async () => {
      if (!solanaAddr && !cosmosAddr) {
        setSolanaBalance(24.50);
        setCosmosBalance(12.50);
        return;
      }

      setIsLoadingNonEvm(true);
      try {
        if (solanaAddr) {
          const solUSDC = await fetchSolanaUsdcBalance(solanaAddr);
          if (active) {
            setSolanaBalance(solUSDC);
          }
        }
        if (cosmosAddr) {
          const atom = await fetchCosmosBalance(cosmosAddr);
          if (active) {
            setCosmosBalance(atom);
          }
        }
      } catch (e) {
        console.error("Error fetching non-EVM balances:", e);
      } finally {
        if (active) {
          setIsLoadingNonEvm(false);
        }
      }
    };

    fetchBalances();
    const interval = setInterval(fetchBalances, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [solanaAddr, cosmosAddr]);

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
    // Mock EVM chains
    { id: "base", name: "Base", symbol: "USDC", balance: 45.50, color: "#0052FF", isMock: true },
    { id: "arbitrum", name: "Arbitrum", symbol: "USDC", balance: 80.00, color: "#2D374B", isMock: true },
    // Solana chain: real if address exists, otherwise mock
    {
      id: "solana",
      name: "Solana",
      symbol: "USDC",
      balance: solanaAddr ? solanaBalance : 24.50,
      color: "#9945FF",
      isMock: !solanaAddr,
    },
    // Cosmos chain: real if address exists, otherwise mock
    {
      id: "cosmos",
      name: "Cosmos Hub",
      symbol: "ATOM",
      balance: cosmosAddr ? cosmosBalance : 12.50,
      color: "#E8831A",
      isMock: !cosmosAddr,
    },
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
  const anyConnected = isConnected || !!solanaAddr || !!cosmosAddr;
  const activeAddress = address || solanaAddr || cosmosAddr || null;

  return {
    totalUnified,
    chains,
    isLoading: balanceLoading || isLoadingNonEvm,
    isConnected: anyConnected,
    connectedChainId,
    solanaAddress: solanaAddr,
    cosmosAddress: cosmosAddr,
    activeAddress,
  };
}