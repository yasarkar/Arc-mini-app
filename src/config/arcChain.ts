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
  id: 5_042_002,
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