import { defineChain } from "viem";

// ---------------------------------------------------------------------------
// Arc Testnet — env-based RPC URL with fallback
// ---------------------------------------------------------------------------
const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://rpc.testnet.arc.network";

/**
 * Arc Testnet — Circle'in USDC-native Layer-1 blockchain'i.
 *
 * Blockchain Gezgini: https://testnet.arcscan.app
 * RPC: ARC_RPC_URL env değişkeni ile özelleştirilebilir.
 *
 * ÖNEMLİ: Bu zincir EVM uyumludur ancak native gas token ETH değil USDC'dir.
 * Native view (gas/msg.value) decimals = 18.
 * ERC-20 view (USDC token contract) decimals = 6.
 */
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [ARC_RPC_URL],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
});

export const hyperEvmTestnet = defineChain({
  id: 998,
  name: "HyperEVM Testnet",
  nativeCurrency: {
    name: "Hype",
    symbol: "HYPE",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.hyperliquid-testnet.xyz/evm"],
    },
  },
  blockExplorers: {
    default: {
      name: "Hyperliquid Explorer",
      url: "https://app.hyperliquid-testnet.xyz/explorer",
    },
  },
});

export const sonicTestnet = defineChain({
  id: 14601,
  name: "Sonic Testnet",
  nativeCurrency: {
    name: "Sonic",
    symbol: "S",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.testnet.soniclabs.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "SonicScan",
      url: "https://testnet.sonicscan.org",
    },
  },
});