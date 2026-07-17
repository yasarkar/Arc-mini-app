import { defineChain } from "viem";

/**
 * Arc Testnet — Circle'in USDC-native Layer-1 blockchain'i.
 *
 * Blockchain Gezgini: https://testnet.arcscan.app
 * RPC (Placeholder): https://testnet.arc.io/rpc
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
      // Not: Geçici placeholder RPC — üretimde güncellenmelidir.
      http: ["https://testnet.arc.io/rpc"],
    },
  },
  blockExplorers: {
    default: {
      name: "ArcScan",
      url: "https://testnet.arcscan.app",
    },
  },
});
