// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export interface BridgeLogEntry {
  /** Unique audit ID (defaults to burnTxHash or UUID) */
  id: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Source blockchain identifier */
  fromChain: string;
  /** Destination blockchain identifier */
  toChain: string;
  /** USDC bridge amount */
  amount: string;
  /** Optional developer fee monetization amount */
  customFeeAmount?: string;
  /** Developer fee recipient wallet */
  feeRecipient?: string;
  /** Recipient address on destination chain */
  recipientAddress: string;
  /** Overall transaction status */
  status: "SUCCESS" | "FAILED" | "PARTIAL_RETRY";
  /** Source chain burn transaction hash */
  burnTxHash?: string;
  /** Destination chain mint transaction hash */
  mintTxHash?: string;
  /** Source chain block explorer URL */
  burnExplorerUrl?: string;
  /** Destination chain block explorer URL */
  mintExplorerUrl?: string;
  /** Step-by-step audit breakdown */
  stepsSummary: { name: string; state: string; txHash?: string }[];
}

export const LOGS_STORAGE_KEY = "arc_bridge_compliance_history_v1";

// ---------------------------------------------------------------------------
// Multi-Chain Explorer URL Generator
// ---------------------------------------------------------------------------
/**
 * Resolves the block explorer URL for a given blockchain and transaction hash.
 */
export function getExplorerTxUrl(chain: string, txHash: string): string {
  if (!txHash) return "";

  const normalizedChain = chain.toLowerCase();

  if (normalizedChain.includes("sepolia") && normalizedChain.includes("ethereum")) {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  }
  if (normalizedChain.includes("arc")) {
    return `https://testnet.arcscan.app/tx/${txHash}`;
  }
  if (normalizedChain.includes("polygon") || normalizedChain.includes("amoy")) {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
  if (normalizedChain.includes("base")) {
    return `https://sepolia.basescan.org/tx/${txHash}`;
  }
  if (normalizedChain.includes("arbitrum")) {
    return `https://sepolia.arbiscan.io/tx/${txHash}`;
  }
  if (normalizedChain.includes("optimism") || normalizedChain.includes("op")) {
    return `https://sepolia-optimism.etherscan.io/tx/${txHash}`;
  }

  // Default fallback
  return `https://testnet.arcscan.app/tx/${txHash}`;
}

// ---------------------------------------------------------------------------
// Logging & Persistence Functions
// ---------------------------------------------------------------------------
/**
 * Appends a structured compliance log entry to localStorage.
 */
export function logBridgeTransaction(
  entry: Omit<BridgeLogEntry, "id" | "timestamp">
): BridgeLogEntry {
  const burnTxHash = entry.burnTxHash;
  const mintTxHash = entry.mintTxHash;

  const fullEntry: BridgeLogEntry = {
    ...entry,
    id: burnTxHash || `log_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: Date.now(),
    burnExplorerUrl: burnTxHash
      ? getExplorerTxUrl(entry.fromChain, burnTxHash)
      : undefined,
    mintExplorerUrl: mintTxHash
      ? getExplorerTxUrl(entry.toChain, mintTxHash)
      : undefined,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getBridgeHistoryLogs();
      const updated = [fullEntry, ...existing].slice(0, 100); // Keep latest 100 logs
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error("Failed to save bridge compliance log:", error);
    }
  }

  return fullEntry;
}

/**
 * Retrieves all stored bridge compliance logs from localStorage.
 */
export function getBridgeHistoryLogs(): BridgeLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to parse bridge compliance logs:", error);
    return [];
  }
}

/**
 * Clears stored bridge compliance history logs.
 */
export function clearBridgeHistoryLogs(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LOGS_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear bridge compliance logs:", error);
  }
}
