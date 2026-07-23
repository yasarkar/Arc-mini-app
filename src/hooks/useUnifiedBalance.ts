"use client";

import { useAccount, useBalance } from "wagmi";
import { useState, useEffect } from "react";
import { formatUnits } from "viem";

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
  /** Whether core Arc Testnet balance is loading */
  isArcLoading: boolean;
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
    const res = await fetch("https://api.devnet.solana.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccountsByOwner",
        params: [
          address,
          { mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
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
    const res = await fetch(`https://cosmos-testnet-api.polkachu.com/cosmos/bank/v1beta1/balances/${address}`);
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

// USDC ERC-20 contract addresses on EVM networks
const USDC_CONTRACTS = {
  arc: "0x3600000000000000000000000000000000000000",
  polygon: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  base: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arbitrum: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  ethereum: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  avalanche: "0x5425890298aed601595a70ab815c96711a31bc65",
  hyperEvm: "0x2B3370eE501B4a559b57D449569354196457D8Ab",
  optimism: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
  sei: "0x4fCF1784B31630811181f670Aea7A7bEF803eaED",
  sonic: "0x0BA304580ee7c9a980CF72e55f5Ed2E9fd30Bc51",
  unichain: "0x31d0220469e10c4E71834a79b1f276d740d3768F",
  worldChain: "0x66145f38cBAC35Ca6F1Dfb4914dF98F1614aeA88",
};

// ---------------------------------------------------------------------------
// useUnifiedBalance
// ---------------------------------------------------------------------------
export function useUnifiedBalance(): UnifiedBalanceResult {
  const { address, isConnected, chainId } = useAccount();

  const [solanaAddr, setSolanaAddr] = useState<string | null>(null);
  const [cosmosAddr, setCosmosAddr] = useState<string | null>(null);

  // Real-time fetched balances for connected non-EVM wallets
  const [solanaBalance, setSolanaBalance] = useState<number>(0);
  const [cosmosBalance, setCosmosBalance] = useState<number>(0);
  const [isLoadingNonEvm, setIsLoadingNonEvm] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSolanaAddr(localStorage.getItem("solana_address"));
      setCosmosAddr(localStorage.getItem("cosmos_address"));
    }
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

  // 1a. Arc Testnet USDC ERC-20 (relying on the recommended standard ERC-20 interface)
  const { data: arcBalanceData, isLoading: arcBalanceLoading } = useBalance({
    address,
    chainId: 5042002,
    token: USDC_CONTRACTS.arc as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 1b. Arc Testnet Native USDC fallback (18 decimals native EVM gas token balance)
  const { data: arcNativeBalanceData, isLoading: arcNativeLoading } = useBalance({
    address,
    chainId: 5042002,
    query: {
      enabled: !!address && !arcBalanceData,
    }
  });

  // 1c. Polygon Amoy USDC ERC-20
  const { data: polyBalanceData, isLoading: polyBalanceLoading } = useBalance({
    address,
    chainId: 80002,
    token: USDC_CONTRACTS.polygon as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 2. Base Sepolia USDC ERC-20
  const { data: baseBalanceData, isLoading: baseBalanceLoading } = useBalance({
    address,
    chainId: 84532,
    token: USDC_CONTRACTS.base as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 3. Arbitrum Sepolia USDC ERC-20
  const { data: arbBalanceData, isLoading: arbBalanceLoading } = useBalance({
    address,
    chainId: 421614,
    token: USDC_CONTRACTS.arbitrum as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 4. Ethereum Sepolia USDC ERC-20
  const { data: ethBalanceData, isLoading: ethBalanceLoading } = useBalance({
    address,
    chainId: 11155111,
    token: USDC_CONTRACTS.ethereum as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 5. Avalanche Fuji USDC ERC-20
  const { data: avaxBalanceData, isLoading: avaxBalanceLoading } = useBalance({
    address,
    chainId: 43113,
    token: USDC_CONTRACTS.avalanche as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 6. HyperEVM Testnet USDC ERC-20
  const { data: hypeBalanceData, isLoading: hypeBalanceLoading } = useBalance({
    address,
    chainId: 998,
    token: USDC_CONTRACTS.hyperEvm as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 7. OP Sepolia USDC ERC-20
  const { data: opBalanceData, isLoading: opBalanceLoading } = useBalance({
    address,
    chainId: 11155420,
    token: USDC_CONTRACTS.optimism as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 9. Sei Testnet USDC ERC-20
  const { data: seiBalanceData, isLoading: seiBalanceLoading } = useBalance({
    address,
    chainId: 1328,
    token: USDC_CONTRACTS.sei as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 10. Sonic Testnet USDC ERC-20
  const { data: sonicBalanceData, isLoading: sonicBalanceLoading } = useBalance({
    address,
    chainId: 14601,
    token: USDC_CONTRACTS.sonic as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 11. Unichain Sepolia USDC ERC-20
  const { data: uniBalanceData, isLoading: uniBalanceLoading } = useBalance({
    address,
    chainId: 1301,
    token: USDC_CONTRACTS.unichain as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  // 12. World Chain Sepolia USDC ERC-20
  const { data: wcBalanceData, isLoading: wcBalanceLoading } = useBalance({
    address,
    chainId: 4801,
    token: USDC_CONTRACTS.worldChain as `0x${string}`,
    query: {
      enabled: !!address,
    }
  });

  const connectedChainId = chainId ?? null;

  // Resolve Arc balance: Prefer ERC-20 data (6 decimals), fallback to native EVM balance (18 decimals)
  const arcResolvedBalance = arcBalanceData
    ? parseFloat(arcBalanceData.formatted)
    : arcNativeBalanceData
    ? parseFloat(formatUnits(arcNativeBalanceData.value, 18))
    : null;

  // Build the permanent portfolio breakdown
  const chains: ChainBalance[] = [
    // 1. Arc Testnet
    {
      id: "arc",
      name: "Arc Testnet",
      symbol: "USDC",
      balance: isConnected && arcResolvedBalance !== null ? arcResolvedBalance : 0,
      color: "#00D4AA",
      isMock: false,
    },
    // 1b. Polygon Amoy
    {
      id: "polygon",
      name: "Polygon Amoy",
      symbol: "USDC",
      balance: isConnected && polyBalanceData ? parseFloat(polyBalanceData.formatted) : 0,
      color: "#8247E5",
      isMock: false,
    },
    // 2. Base Sepolia
    {
      id: "base",
      name: "Base Sepolia",
      symbol: "USDC",
      balance: isConnected && baseBalanceData ? parseFloat(baseBalanceData.formatted) : 0,
      color: "#0052FF",
      isMock: false,
    },
    // 3. Arbitrum Sepolia
    {
      id: "arbitrum",
      name: "Arbitrum Sepolia",
      symbol: "USDC",
      balance: isConnected && arbBalanceData ? parseFloat(arbBalanceData.formatted) : 0,
      color: "#2D374B",
      isMock: false,
    },
    // 4. Ethereum Sepolia
    {
      id: "ethereum",
      name: "Ethereum Sepolia",
      symbol: "USDC",
      balance: isConnected && ethBalanceData ? parseFloat(ethBalanceData.formatted) : 0,
      color: "#627EEA",
      isMock: false,
    },
    // 5. Avalanche Fuji
    {
      id: "avalanche",
      name: "Avalanche Fuji",
      symbol: "USDC",
      balance: isConnected && avaxBalanceData ? parseFloat(avaxBalanceData.formatted) : 0,
      color: "#E84142",
      isMock: false,
    },
    // 6. HyperEVM Testnet
    {
      id: "hyperEvm",
      name: "HyperEVM Testnet",
      symbol: "USDC",
      balance: isConnected && hypeBalanceData ? parseFloat(hypeBalanceData.formatted) : 0,
      color: "#00FFA3",
      isMock: false,
    },
    // 7. OP Sepolia
    {
      id: "optimism",
      name: "OP Sepolia",
      symbol: "USDC",
      balance: isConnected && opBalanceData ? parseFloat(opBalanceData.formatted) : 0,
      color: "#FF0420",
      isMock: false,
    },
    // 9. Sei Testnet
    {
      id: "sei",
      name: "Sei Testnet",
      symbol: "USDC",
      balance: isConnected && seiBalanceData ? parseFloat(seiBalanceData.formatted) : 0,
      color: "#9E1B1B",
      isMock: false,
    },
    // 10. Solana Devnet
    {
      id: "solana",
      name: "Solana Devnet",
      symbol: "USDC",
      balance: solanaBalance,
      color: "#9945FF",
      isMock: false,
    },
    // 11. Sonic Testnet
    {
      id: "sonic",
      name: "Sonic Testnet",
      symbol: "USDC",
      balance: isConnected && sonicBalanceData ? parseFloat(sonicBalanceData.formatted) : 0,
      color: "#FF5A00",
      isMock: false,
    },
    // 12. Unichain Sepolia
    {
      id: "unichain",
      name: "Unichain Sepolia",
      symbol: "USDC",
      balance: isConnected && uniBalanceData ? parseFloat(uniBalanceData.formatted) : 0,
      color: "#FF007A",
      isMock: false,
    },
    // 13. World Chain Sepolia
    {
      id: "worldchain",
      name: "World Chain Sepolia",
      symbol: "USDC",
      balance: isConnected && wcBalanceData ? parseFloat(wcBalanceData.formatted) : 0,
      color: "#3F3F46",
      isMock: false,
    },
  ];

  const totalUnified = chains.reduce((sum, c) => sum + c.balance, 0);
  const anyConnected = isConnected || !!solanaAddr || !!cosmosAddr;
  const activeAddress = address || solanaAddr || cosmosAddr || null;

  const isLoading =
    arcBalanceLoading ||
    baseBalanceLoading ||
    arbBalanceLoading ||
    ethBalanceLoading ||
    avaxBalanceLoading ||
    hypeBalanceLoading ||
    opBalanceLoading ||
    seiBalanceLoading ||
    sonicBalanceLoading ||
    uniBalanceLoading ||
    wcBalanceLoading ||
    isLoadingNonEvm;

  const isArcLoading = isConnected && arcBalanceLoading && arcNativeLoading;

  return {
    totalUnified,
    chains,
    isLoading,
    isArcLoading,
    isConnected: anyConnected,
    connectedChainId,
    solanaAddress: solanaAddr,
    cosmosAddress: cosmosAddr,
    activeAddress,
  };
}