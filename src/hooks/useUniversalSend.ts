"use client";

import { useState, useCallback, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SendStatus =
  | "idle"
  | "aggregating"
  | "bridging"
  | "finalizing"
  | "success"
  | "error";

export interface UniversalSendResult {
  sendStatus: SendStatus;
  sendError: string | null;
  executeSend: (toAddress: string, amount: number) => Promise<void>;
  resetSend: () => void;
}

// ---------------------------------------------------------------------------
// useUniversalSend
// ---------------------------------------------------------------------------
export function useUniversalSend(
  totalUnified: number,
  realArcBalance: number,
  isConnected: boolean,
): UniversalSendResult {
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");
  const [sendError, setSendError] = useState<string | null>(null);
  const cancelledRef = useRef(false);

  const resetSend = useCallback(() => {
    setSendStatus("idle");
    setSendError(null);
    cancelledRef.current = false;
  }, []);

  /** Sleep helper — returns false if cancelled mid-way */
  const sleep = useCallback((ms: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = setTimeout(() => {
        if (!cancelledRef.current) resolve(true);
        else resolve(false);
      }, ms);
      // Store timer so we could clear it, but since cancelledRef is
      // checked after the sleep, this is sufficient.
      (sleep as unknown as Record<string, unknown>)._timer = id;
    });
  }, []);

  const executeSend = useCallback(
    async (toAddress: string, amount: number) => {
      // Guard: wallet must be connected
      if (!isConnected) {
        setSendError("Wallet not connected.");
        setSendStatus("error");
        return;
      }

      // Guard: amount must be positive
      if (amount <= 0) {
        setSendError("Amount must be greater than 0.");
        setSendStatus("error");
        return;
      }

      // Guard: address basic validation
      if (!toAddress.startsWith("0x") || toAddress.length < 10) {
        setSendError("Invalid recipient address.");
        setSendStatus("error");
        return;
      }

      // Guard: sufficient unified balance
      if (amount > totalUnified) {
        setSendError(
          `Insufficient balance. You have $${totalUnified.toFixed(2)} USDC across all chains.`,
        );
        setSendStatus("error");
        return;
      }

      cancelledRef.current = false;
      setSendError(null);

      // ─── Decision: do we need to aggregate from other chains? ───
      const arcCovers = realArcBalance >= amount;

      if (arcCovers) {
        // Arc balance alone is enough — skip aggregation & bridging
        setSendStatus("finalizing");
        const ok = await sleep(2000);
        if (!ok) return;

        setSendStatus("success");
      } else {
        // Need funds from other chains — full stepper flow
        setSendStatus("aggregating");
        let ok = await sleep(2000);
        if (!ok) return;

        setSendStatus("bridging");
        ok = await sleep(2000);
        if (!ok) return;

        setSendStatus("finalizing");
        ok = await sleep(2000);
        if (!ok) return;

        setSendStatus("success");
      }
    },
    [totalUnified, realArcBalance, isConnected, sleep],
  );

  return { sendStatus, sendError, executeSend, resetSend };
}
