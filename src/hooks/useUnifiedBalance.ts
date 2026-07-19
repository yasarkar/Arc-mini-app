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
  const [cosmosBalance, setCosmosBalance] = useState<number>(12.50);
  const [isLoadingNonEvm, setIsLoadingNonEvm] = useState<boolean>(false);

  // Simulated balances synced through localStorage for otonom worker operations
  const [baseSimBalance, setBaseSimBalance] = useState<number>(45.50);
  const [arbitrumSimBalance, setArbitrumSimBalance] = useState<number>(80.00);
  const [ethereumSimBalance, setEthereumSimBalance] = useState<number>(35.00);
  const [arcSimBalance, setArcSimBalance] = useState<number>(0.00);
  const [avalancheSimBalance, setAvalancheSimBalance] = useState<number>(15.00);
  const [hyperEvmSimBalance, setHyperEvmSimBalance] = useState<number>(10.00);
  const [optimismSimBalance, setOptimismSimBalance] = useState<number>(55.00);
  const [seiSimBalance, setSeiSimBalance] = useState<number>(25.00);
  const [sonicSimBalance, setSonicSimBalance] = useState<number>(40.00);
  const [unichainSimBalance, setUnichainSimBalance] = useState<number>(20.00);
  const [worldChainSimBalance, setWorldChainSimBalance] = useState<number>(12.00);

  const loadSimBalances = () => {
    if (typeof window !== "undefined") {
      setSolanaAddr(localStorage.getItem("solana_address"));
      setCosmosAddr(localStorage.getItem("cosmos_address"));

      const base = localStorage.getItem("sim_balance_base");
      const arb = localStorage.getItem("sim_balance_arbitrum");
      const eth = localStorage.getItem("sim_balance_ethereum");
      const arc = localStorage.getItem("sim_balance_arc");
      const avax = localStorage.getItem("sim_balance_avalanche");
      const hype = localStorage.getItem("sim_balance_hyperEvm");
      const op = localStorage.getItem("sim_balance_optimism");
      const sei = localStorage.getItem("sim_balance_sei");
      const son = localStorage.getItem("sim_balance_sonic");
      const uni = localStorage.getItem("sim_balance_unichain");
      const wc = localStorage.getItem("sim_balance_worldchain");



      if (base !== null) setBaseSimBalance(parseFloat(base));
      else { localStorage.setItem("sim_balance_base", "45.50"); setBaseSimBalance(45.50); }

      if (arb !== null) setArbitrumSimBalance(parseFloat(arb));
      else { localStorage.setItem("sim_balance_arbitrum", "80.00"); setArbitrumSimBalance(80.00); }

      if (eth !== null) setEthereumSimBalance(parseFloat(eth));
      else { localStorage.setItem("sim_balance_ethereum", "35.00"); setEthereumSimBalance(35.00); }

      if (arc !== null) setArcSimBalance(parseFloat(arc));
      else { localStorage.setItem("sim_balance_arc", "0.00"); setArcSimBalance(0.00); }

      if (avax !== null) setAvalancheSimBalance(parseFloat(avax));
      else { localStorage.setItem("sim_balance_avalanche", "15.00"); setAvalancheSimBalance(15.00); }

      if (hype !== null) setHyperEvmSimBalance(parseFloat(hype));
      else { localStorage.setItem("sim_balance_hyperEvm", "10.00"); setHyperEvmSimBalance(10.00); }

      if (op !== null) setOptimismSimBalance(parseFloat(op));
      else { localStorage.setItem("sim_balance_optimism", "55.00"); setOptimismSimBalance(55.00); }

      if (sei !== null) setSeiSimBalance(parseFloat(sei));
      else { localStorage.setItem("sim_balance_sei", "25.00"); setSeiSimBalance(25.00); }

      if (son !== null) setSonicSimBalance(parseFloat(son));
      else { localStorage.setItem("sim_balance_sonic", "40.00"); setSonicSimBalance(40.00); }

      if (uni !== null) setUnichainSimBalance(parseFloat(uni));
      else { localStorage.setItem("sim_balance_unichain", "20.00"); setUnichainSimBalance(20.00); }

      if (wc !== null) setWorldChainSimBalance(parseFloat(wc));
      else { localStorage.setItem("sim_balance_worldchain", "12.00"); setWorldChainSimBalance(12.00); }
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

  // 1. Arc Testnet USDC (using native balance to avoid RPC rate-limiting on contract eth_call queries)
  const { data: arcBalanceData, isLoading: arcBalanceLoading } = useBalance({
    address,
    chainId: 5042002,
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

  // Build the permanent portfolio breakdown
  const chains: ChainBalance[] = [
    // 1. Arc Testnet
    {
      id: "arc",
      name: "Arc Testnet",
      symbol: "USDC",
      balance: isConnected && arcBalanceData?.value ? parseFloat(formatUnits(arcBalanceData.value, 18)) : arcSimBalance,
      color: "#00D4AA",
      isMock: !isConnected,
    },
    // 2. Base Sepolia
    {
      id: "base",
      name: "Base Sepolia",
      symbol: "USDC",
      balance: isConnected && baseBalanceData ? parseFloat(baseBalanceData.formatted) : baseSimBalance,
      color: "#0052FF",
      isMock: !isConnected,
    },
    // 3. Arbitrum Sepolia
    {
      id: "arbitrum",
      name: "Arbitrum Sepolia",
      symbol: "USDC",
      balance: isConnected && arbBalanceData ? parseFloat(arbBalanceData.formatted) : arbitrumSimBalance,
      color: "#2D374B",
      isMock: !isConnected,
    },
    // 4. Ethereum Sepolia
    {
      id: "ethereum",
      name: "Ethereum Sepolia",
      symbol: "USDC",
      balance: isConnected && ethBalanceData ? parseFloat(ethBalanceData.formatted) : ethereumSimBalance,
      color: "#627EEA",
      isMock: !isConnected,
    },
    // 5. Avalanche Fuji
    {
      id: "avalanche",
      name: "Avalanche Fuji",
      symbol: "USDC",
      balance: isConnected && avaxBalanceData ? parseFloat(avaxBalanceData.formatted) : avalancheSimBalance,
      color: "#E84142",
      isMock: !isConnected,
    },
    // 6. HyperEVM Testnet
    {
      id: "hyperEvm",
      name: "HyperEVM Testnet",
      symbol: "USDC",
      balance: isConnected && hypeBalanceData ? parseFloat(hypeBalanceData.formatted) : hyperEvmSimBalance,
      color: "#00FFA3",
      isMock: !isConnected,
    },
    // 7. OP Sepolia
    {
      id: "optimism",
      name: "OP Sepolia",
      symbol: "USDC",
      balance: isConnected && opBalanceData ? parseFloat(opBalanceData.formatted) : optimismSimBalance,
      color: "#FF0420",
      isMock: !isConnected,
    },
    // 9. Sei Testnet
    {
      id: "sei",
      name: "Sei Testnet",
      symbol: "USDC",
      balance: isConnected && seiBalanceData ? parseFloat(seiBalanceData.formatted) : seiSimBalance,
      color: "#9E1B1B",
      isMock: !isConnected,
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
      balance: isConnected && sonicBalanceData ? parseFloat(sonicBalanceData.formatted) : sonicSimBalance,
      color: "#FF5A00",
      isMock: !isConnected,
    },
    // 12. Unichain Sepolia
    {
      id: "unichain",
      name: "Unichain Sepolia",
      symbol: "USDC",
      balance: isConnected && uniBalanceData ? parseFloat(uniBalanceData.formatted) : unichainSimBalance,
      color: "#FF007A",
      isMock: !isConnected,
    },
    // 13. World Chain Sepolia
    {
      id: "worldchain",
      name: "World Chain Sepolia",
      symbol: "USDC",
      balance: isConnected && wcBalanceData ? parseFloat(wcBalanceData.formatted) : worldChainSimBalance,
      color: "#3F3F46",
      isMock: !isConnected,
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

  return {
    totalUnified,
    chains,
    isLoading,
    isConnected: anyConnected,
    connectedChainId,
    solanaAddress: solanaAddr,
    cosmosAddress: cosmosAddr,
    activeAddress,
  };
}