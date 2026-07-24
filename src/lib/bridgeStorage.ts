import type { BridgeResult as AppKitBridgeResult } from "@circle-fin/app-kit";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------
export interface StoredBridgeTx {
  timestamp: number;
  params: {
    fromChain: string;
    toChain: string;
    amount: string;
    recipientAddress?: string;
    useForwarder?: boolean;
    transferSpeed?: "FAST" | "SLOW";
    maxFee?: string;
    customFeeAmount?: string;
  };
  result: AppKitBridgeResult | any;
}

export const STORAGE_KEY = "arc_bridge_pending_tx_v1";

// ---------------------------------------------------------------------------
// LocalStorage Persistence Helpers
// ---------------------------------------------------------------------------
/**
 * Safely saves the current bridge execution state into browser localStorage.
 */
export function saveBridgeState(tx: StoredBridgeTx): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(tx);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error("Failed to save bridge state to localStorage:", error);
  }
}

/**
 * Safely retrieves the stored pending or failed bridge transaction from localStorage.
 */
export function getSavedBridgeState(): StoredBridgeTx | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBridgeTx;
    if (!parsed || typeof parsed !== "object" || !parsed.params || !parsed.result) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error("Failed to parse saved bridge state from localStorage:", error);
    return null;
  }
}

/**
 * Clears the stored bridge state from localStorage upon completion or manual dismissal.
 */
export function clearSavedBridgeState(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear saved bridge state from localStorage:", error);
  }
}
