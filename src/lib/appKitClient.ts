import { AppKit } from "@circle-fin/app-kit";

// ---------------------------------------------------------------------------
// Singleton Circle AppKit Client Instance
// ---------------------------------------------------------------------------
/**
 * Global singleton instance of Circle AppKit SDK.
 * Handles Bridge, Send, Swap, and Unified Balance operations.
 */
export const appKit = new AppKit();

/**
 * Singleton alias export for compatibility across the codebase.
 */
export const kit = appKit;

// ---------------------------------------------------------------------------
// Bridge & Chain Environment Configuration
// ---------------------------------------------------------------------------
export interface BridgeFeeConfig {
  /** Developer fee recipient address on source chain */
  feeRecipientAddress: string;
  /** Primary Arc Testnet RPC URL */
  arcRpcUrl: string;
  /** Ethereum Sepolia RPC URL */
  sepoliaRpcUrl: string;
  /** Default USDC token decimal standard */
  usdcDecimals: number;
}

/**
 * Environment-backed configuration for Arc Bridge & Circle CCTP operations.
 */
export const ARC_BRIDGE_CONFIG: BridgeFeeConfig = {
  feeRecipientAddress:
    process.env.NEXT_PUBLIC_FEE_RECIPIENT_ADDRESS ??
    "0x0000000000000000000000000000000000000000",
  arcRpcUrl:
    process.env.NEXT_PUBLIC_ARC_TESTNET_RPC ??
    process.env.NEXT_PUBLIC_ARC_RPC_URL ??
    "https://rpc.testnet.arc.network",
  sepoliaRpcUrl:
    process.env.NEXT_PUBLIC_SEPOLIA_RPC ?? "https://rpc.ankr.com/eth_sepolia",
  usdcDecimals: 6,
};

/**
 * Validates whether the fee recipient address is set to a non-zero developer wallet.
 */
export function isFeeRecipientConfigured(): boolean {
  const addr = ARC_BRIDGE_CONFIG.feeRecipientAddress;
  return (
    Boolean(addr) &&
    addr !== "0x0000000000000000000000000000000000000000" &&
    addr.startsWith("0x") &&
    addr.length === 42
  );
}
