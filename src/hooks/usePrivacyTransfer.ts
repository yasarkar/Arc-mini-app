"use client";

import { useState, useCallback, useRef } from "react";

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
// usePrivacyTransfer
// ---------------------------------------------------------------------------
export function usePrivacyTransfer(): PrivacyTransferResult {
  const [isPrivateMode, setIsPrivateMode] = useState(false);
  const [lastViewingKey, setLastViewingKey] = useState<string | null>(null);

  // Map of viewingKey -> transaction details
  const keyStore = useRef<Map<string, PrivateTxDetails>>(new Map());
  // Ordered list for display
  const keyList = useRef<{ key: string; details: PrivateTxDetails }[]>([]);

  const togglePrivacy = useCallback(() => {
    setIsPrivateMode((prev) => !prev);
  }, []);

  const generateViewingKey = useCallback(
    (txHash: string, details: PrivateTxDetails): string => {
      // Generate a viewing key like: vkey_arc_1f9a...8b2c
      const entropy = randomHex(16);
      const checksum = randomHex(4);
      const viewingKey = `vkey_arc_${entropy}${checksum}`;

      // Store the mapping
      keyStore.current.set(viewingKey, details);
      keyList.current = [
        { key: viewingKey, details },
        ...keyList.current,
      ];
      setLastViewingKey(viewingKey);

      return viewingKey;
    },
    [],
  );

  const revealTransactionDetails = useCallback(
    (viewingKey: string): PrivateTxDetails | null => {
      // Simulated decryption: look up in our store
      const details = keyStore.current.get(viewingKey);
      if (!details) return null;

      // Return a copy to prevent mutation
      return { ...details };
    },
    [],
  );

  return {
    isPrivateMode,
    togglePrivacy,
    generateViewingKey,
    revealTransactionDetails,
    lastViewingKey,
    storedKeys: keyList.current,
  };
}