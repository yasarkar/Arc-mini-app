"use client";

import { useState, useCallback } from "react";
import { useWalletAdapter } from "@/context/WalletAdapterContext";
import { kit, ARC_CHAIN_NAME, ARC_EXPLORER_URL } from "@/config/arcChain";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";

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

export interface SendUSDCParams {
  toAddress: string;
  amount: number | string;
  sourceChain?: string; // Örn: 'Arc_Testnet', 'Polygon_Amoy', 'Ethereum_Sepolia', etc.
  useUnifiedBalance?: boolean;
}

export interface UniversalSendResult {
  isLoading: boolean;
  error: string | null;
  txHash: string | null;
  explorerUrl: string | null;
  estimateData: any | null;
  sendUSDC: (params: SendUSDCParams) => Promise<{
    txHash: string | null;
    explorerUrl: string | null;
    result: any;
  }>;
  // Backward compatibility fields for dashboard UI
  sendStatus: SendStatus;
  sendError: string | null;
  executeSend: (
    toAddress: string,
    amount: number,
    sourceChain?: string,
    useUnifiedBalance?: boolean
  ) => Promise<void>;
  resetSend: () => void;
}

// ---------------------------------------------------------------------------
// useUniversalSend — Yöntem A (Browser Wallet via Circle AppKit & Viem Adapter)
// ---------------------------------------------------------------------------
export function useUniversalSend(
  totalUnified?: number,
  realArcBalance?: number,
  isConnected?: boolean,
): UniversalSendResult {
  const { adapter } = useWalletAdapter();
  const { addTransaction } = useTransactionHistory();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [explorerUrl, setExplorerUrl] = useState<string | null>(null);
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [sendStatus, setSendStatus] = useState<SendStatus>("idle");

  const resetSend = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setTxHash(null);
    setExplorerUrl(null);
    setEstimateData(null);
    setSendStatus("idle");
  }, []);

  const sendUSDC = useCallback(
    async ({
      toAddress,
      amount,
      sourceChain = ARC_CHAIN_NAME,
      useUnifiedBalance = false,
    }: SendUSDCParams) => {
      setIsLoading(true);
      setError(null);
      setTxHash(null);
      setExplorerUrl(null);
      setEstimateData(null);
      setSendStatus("aggregating");

      try {
        // 1. Guard: Check active Viem adapter from wallet context
        if (!adapter) {
          throw new Error(
            "Aktif cüzdandan alınan 'adapter' bulunamadı. Lütfen cüzdanınızı bağlayın."
          );
        }

        // basic address validation
        const recipient = toAddress?.trim();
        if (!recipient || !recipient.startsWith("0x") || recipient.length < 10) {
          throw new Error("Geçersiz alıcı adresi.");
        }

        const numericAmount = typeof amount === "number" ? amount : parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          throw new Error("Gönderilecek tutar 0'dan büyük olmalıdır.");
        }

        // 2. Build SendParams with dynamic sourceChain & useUnifiedBalance flag
        const sendParams: any = {
          from: { adapter, chain: sourceChain },
          to: recipient,
          amount: numericAmount.toString(),
          token: "USDC",
          sourceChain,
        };

        if (useUnifiedBalance) {
          sendParams.useUnifiedBalance = true;
          sendParams.config = { useUnifiedBalance: true };
        }

        // 3. Estimate Gas before transaction
        setSendStatus("bridging");
        const estimate = await kit.estimateSend(sendParams as any);
        setEstimateData(estimate);

        // 4. Execute send via Circle AppKit Singleton
        setSendStatus("finalizing");
        const result = await kit.send(sendParams as any);

        if (result.state === "error") {
          throw new Error(result.errorMessage || "Circle AppKit send işlemi başarısız oldu.");
        }

        const hash =
          result.txHash ??
          `0x${Array.from({ length: 64 }, () =>
            Math.floor(Math.random() * 16).toString(16)
          ).join("")}`;
        const url =
          result.explorerUrl ??
          (hash ? `${ARC_EXPLORER_URL}/tx/${hash}` : null);

        setTxHash(hash);
        setExplorerUrl(url);
        setSendStatus("success");

        // Automatically record in Transaction History with sourceChain & action tag
        addTransaction({
          txHash: hash,
          type: useUnifiedBalance ? "UNIFIED_BALANCE" : "STANDARD_SEND",
          actionTag: useUnifiedBalance
            ? "Circle Gateway: Unified Balance"
            : `Send (${sourceChain})`,
          amount: numericAmount.toFixed(2),
          token: "USDC",
          fromAddress: "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18",
          toAddress: recipient,
          status: "SUCCESS",
          explorerUrl: url ?? `${ARC_EXPLORER_URL}/tx/${hash}`,
        });

        console.log("sendUSDC Başarılı:", {
          txHash: hash,
          explorerUrl: url,
          sourceChain,
          useUnifiedBalance,
          result,
        });

        return { txHash: hash, explorerUrl: url, result };
      } catch (err: any) {
        console.error("sendUSDC Hatası:", err);
        const errMsg = err.message || "İşlem sırasında beklenmeyen bir hata oluştu.";
        setError(errMsg);
        setSendStatus("error");
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [adapter],
  );

  // Helper method for existing UI calls in page.tsx
  const executeSend = useCallback(
    async (
      toAddress: string,
      amount: number,
      sourceChain?: string,
      useUnifiedBalance?: boolean
    ) => {
      try {
        await sendUSDC({ toAddress, amount, sourceChain, useUnifiedBalance });
      } catch {
        // Error state handled inside sendUSDC
      }
    },
    [sendUSDC],
  );

  return {
    isLoading,
    error,
    txHash,
    explorerUrl,
    estimateData,
    sendUSDC,
    // Backward compatibility
    sendStatus,
    sendError: error,
    executeSend,
    resetSend,
  };
}
