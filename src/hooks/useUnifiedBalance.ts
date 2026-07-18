"use client";

import { useAccount, useBalance } from "wagmi";
import { arcTestnet } from "@/config/arcChain";
import { useState, useEffect } from "react";

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
  solanaAddress: string | null;
  cosmosAddress: string | null;
  activeAddress: string | null;
}

// Fetch Solana USDC balance from public RPC
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

// Fetch Cosmos ATOM balance from public REST endpoint
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

// ---------------------------------------------------------------------------
// useUnifiedBalance
// ---------------------------------------------------------------------------
export function useUnifiedBalance(): UnifiedBalanceResult {
  const { address, isConnected, chainId } = useAccount();

  const [solanaAddr, setSolanaAddr] = useState<string | null>(null);
  const [cosmosAddr, setCosmosAddr] = useState<string | null>(null);

  // Real-time fetched balances for connected non-EVM wallets
  const [solanaBalance, setSolanaBalance] = useState<number>(24.50);
  const [cosmosBalance, setCosmosBalance] = useState<number>(12.50);
  const [isLoadingNonEvm, setIsLoadingNonEvm] = useState<boolean>(false);

  // Simulated balances synced through localStorage for otonom worker operations
  const [solanaSimBalance, setSolanaSimBalance] = useState<number>(24.50);
  const [baseSimBalance, setBaseSimBalance] = useState<number>(45.50);
  const [arbitrumSimBalance, setArbitrumSimBalance] = useState<number>(80.00);
  const [arcSimBalance, setArcSimBalance] = useState<number>(0.00);

  const loadSimBalances = () => {
    if (typeof window !== "undefined") {
      setSolanaAddr(localStorage.getItem("solana_address"));
      setCosmosAddr(localStorage.getItem("cosmos_address"));

      const sol = localStorage.getItem("sim_balance_solana");
      const base = localStorage.getItem("sim_balance_base");
      const arb = localStorage.getItem("sim_balance_arbitrum");
      const arc = localStorage.getItem("sim_balance_arc");

      if (sol !== null) {
        setSolanaSimBalance(parseFloat(sol));
      } else {
        localStorage.setItem("sim_balance_solana", "24.50");
        setSolanaSimBalance(24.50);
      }

      if (base !== null) {
        setBaseSimBalance(parseFloat(base));
      } else {
        localStorage.setItem("sim_balance_base", "45.50");
        setBaseSimBalance(45.50);
      }

      if (arb !== null) {
        setArbitrumSimBalance(parseFloat(arb));
      } else {
        localStorage.setItem("sim_balance_arbitrum", "80.00");
        setArbitrumSimBalance(80.00);
      }

      if (arc !== null) {
        setArcSimBalance(parseFloat(arc));
      } else {
        localStorage.setItem("sim_balance_arc", "0.00");
        setArcSimBalance(0.00);
      }
    }
  };

  useEffect(() => {
    loadSimBalances();
    window.addEventListener("balance-update", loadSimBalances);
    window.addEventListener("wallet-connection-update", loadSimBalances);
    return () => {
      window.removeEventListener("balance-update", loadSimBalances);
      window.removeEventListener("wallet-connection-update", loadSimBalances);
    };
  }, []);

  // Poll real on-chain balances if non-EVM addresses exist
  useEffect(() => {
    let active = true;
    const fetchBalances = async () => {
      if (!solanaAddr && !cosmosAddr) {
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
    const interval = setInterval(fetchBalances, 25000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [solanaAddr, cosmosAddr]);

  // Real EVM balance from connected wallet
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    chainId,
  });

  const realBalance = balanceData ? parseFloat(balanceData.formatted) : 0;
  const connectedChainId = chainId ?? null;

  // Build the portfolio breakdown
  const chains: ChainBalance[] = [
    // Base Chain: mock/simulated
    {
      id: "base",
      name: "Base",
      symbol: "USDC",
      balance: baseSimBalance,
      color: "#0052FF",
      isMock: true,
    },
    // Arbitrum Chain: mock/simulated
    {
      id: "arbitrum",
      name: "Arbitrum",
      symbol: "USDC",
      balance: arbitrumSimBalance,
      color: "#2D374B",
      isMock: true,
    },
    // Solana Chain: real if wallet extension connected, otherwise simulated
    {
      id: "solana",
      name: "Solana",
      symbol: "USDC",
      balance: solanaAddr ? solanaBalance : solanaSimBalance,
      color: "#9945FF",
      isMock: !solanaAddr,
    },
    // Cosmos Chain: real if wallet extension connected, otherwise simulated
    {
      id: "cosmos",
      name: "Cosmos Hub",
      symbol: "ATOM",
      balance: cosmosAddr ? cosmosBalance : 12.50,
      color: "#E8831A",
      isMock: !cosmosAddr,
    },
    // Arc Testnet Chain: real on-chain balance if connected, otherwise simulated balance
    {
      id: chainId ? `chain_${chainId}` : "arc",
      name: chainId === arcTestnet.id ? "Arc Testnet" : `Chain ${chainId ?? "?"}`,
      symbol: balanceData?.symbol ?? "USDC",
      balance: isConnected ? realBalance : arcSimBalance,
      color: "#00D4AA",
      isMock: !isConnected,
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