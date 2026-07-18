"use client";

import { useState, useCallback, useEffect } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PrivateTxDetails {
  txHash: string;
  sender: string;
  recipient: string;
  amount: number;
  symbol: string;
  timestamp: number;
}

export interface PrivacyTransferResult {
  /** Whether privacy mode is currently enabled */
  isPrivateMode: boolean;
  /** Toggle privacy mode on/off */
  togglePrivacy: () => void;
  /** Generate a cryptographically-random viewing key for a given transaction */
  generateViewingKey: (txHash: string, details: PrivateTxDetails) => string;
  /** Reveal transaction details from a viewing key (simulated) */
  revealTransactionDetails: (viewingKey: string) => PrivateTxDetails | null;
  /** The most recently generated viewing key */
  lastViewingKey: string | null;
  /** All stored viewing keys */
  storedKeys: { key: string; details: PrivateTxDetails }[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a random hex string of the given byte length */
function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// usePrivacyTransfer Hook
// ---------------------------------------------------------------------------
export function usePrivacyTransfer(): PrivacyTransferResult {
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [lastViewingKey, setLastViewingKey] = useState<string | null>(null);
  const [storedKeys, setStoredKeys] = useState<{ key: string; details: PrivateTxDetails }[]>([]);

  const togglePrivacy = useCallback(() => {
    setIsPrivateMode((prev) => !prev);
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const keysJson = localStorage.getItem("stored_viewing_keys");
      if (keysJson) {
        try {
          setStoredKeys(JSON.parse(keysJson));
        } catch (e) {
          console.error("Failed to parse stored viewing keys:", e);
        }
      }
    }
  }, []);

  const generateViewingKey = useCallback(
    (txHash: string, details: PrivateTxDetails): string => {
      // Generate a viewing key like: vkey_arc_1f9a...8b2c
      const entropy = randomHex(16);
      const checksum = randomHex(4);
      const viewingKey = `vkey_arc_${entropy}${checksum}`;

      const newKeyEntry = { key: viewingKey, details };
      
      setStoredKeys((prev) => {
        const updated = [newKeyEntry, ...prev];
        localStorage.setItem("stored_viewing_keys", JSON.stringify(updated));
        return updated;
      });
      
      setLastViewingKey(viewingKey);
      return viewingKey;
    },
    [],
  );

  const revealTransactionDetails = useCallback(
    (viewingKey: string): PrivateTxDetails | null => {
      let found: PrivateTxDetails | null = null;
      if (typeof window !== "undefined") {
        const keysJson = localStorage.getItem("stored_viewing_keys");
        if (keysJson) {
          try {
            const list = JSON.parse(keysJson) as { key: string; details: PrivateTxDetails }[];
            const item = list.find((i) => i.key === viewingKey);
            if (item) {
              found = item.details;
            }
          } catch (e) {
            console.error("Failed to search viewing key in localStorage:", e);
          }
        }
      }
      return found;
    },
    [],
  );

  return {
    isPrivateMode,
    togglePrivacy,
    generateViewingKey,
    revealTransactionDetails,
    lastViewingKey,
    storedKeys,
  };
}