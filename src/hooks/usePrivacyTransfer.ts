"use client";

import { useState, useCallback, useEffect } from "react";
import { encryptTxDetails, decryptTxDetails } from "@/utils/crypto";

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
  generateViewingKey: (txHash: string, details: PrivateTxDetails) => Promise<string>;
  /** Reveal transaction details from a viewing key */
  revealTransactionDetails: (viewingKey: string) => Promise<PrivateTxDetails | null>;
  /** The most recently generated viewing key */
  lastViewingKey: string | null;
  /** All stored viewing keys */
  storedKeys: { key: string; details: PrivateTxDetails }[];
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
    async (txHash: string, details: PrivateTxDetails): Promise<string> => {
      try {
        const viewingKey = await encryptTxDetails(details);

        const newKeyEntry = { key: viewingKey, details };
        
        setStoredKeys((prev) => {
          const updated = [newKeyEntry, ...prev];
          localStorage.setItem("stored_viewing_keys", JSON.stringify(updated));
          return updated;
        });
        
        setLastViewingKey(viewingKey);
        return viewingKey;
      } catch (e) {
        console.error("Failed to generate cryptographic viewing key:", e);
        throw e;
      }
    },
    [],
  );

  const revealTransactionDetails = useCallback(
    async (viewingKey: string): Promise<PrivateTxDetails | null> => {
      // First try to decrypt directly from the key (since the key contains the ciphertext)
      const decrypted = await decryptTxDetails(viewingKey);
      if (decrypted) {
        return decrypted;
      }

      // Fallback: search in storedKeys (localStorage) if decryption fails for older keys
      if (typeof window !== "undefined") {
        const keysJson = localStorage.getItem("stored_viewing_keys");
        if (keysJson) {
          try {
            const list = JSON.parse(keysJson) as { key: string; details: PrivateTxDetails }[];
            const item = list.find((i) => i.key === viewingKey);
            if (item) {
              return item.details;
            }
          } catch (e) {
            console.error("Failed to search viewing key in localStorage:", e);
          }
        }
      }
      return null;
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