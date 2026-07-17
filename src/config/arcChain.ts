import { defineChain } from "viem";

// ---------------------------------------------------------------------------
// Arc Testnet — env-based RPC URL with fallback
// ---------------------------------------------------------------------------
const ARC_RPC_URL =
  process.env.NEXT_PUBLIC_ARC_RPC_URL ?? "https://testnet.arc.io/rpc";

/**
 * Arc Testnet — Circle'in USDC-native Layer-1 blockchain'i.
 *
 * Blockchain Gezgini: https://testnet.arcscan.app
 * RPC: ARC_RPC_URL env değişkeni ile özelleştirilebilir.
 *
 * ÖNEMLİ: Bu zincir EVM uyumludur ancak native gas token ETH değil USDC'dir.
 * NativeCurrency decimals = 6 (USDC standardı).
 */
export const arcTestnet = defineChain({
  id: 111_111,
  name: "Arc Testnet",
  nativeCurrency: {
    name: "USD Coin",
    symbol: "USDC",
    decimals: 6,
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